const { Gtk, GLib, GObject, Gio, St } = imports.gi
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu
const Message = imports.ui.messageTray

const Me = imports.misc.extensionUtils.getCurrentExtension()

const shadowsocks = {
    // this is a really annoying issue, that it is so hard to call an external process and get stdio async in gjs
    // this.fcount, this.exec and this.netget are hacks for this
    fcount: 0,

    // utils
    toast(msg) {
        let label = new St.Label({ text: msg })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor(monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => label.destroy())
    },

    exec(args, timeout=30000) {
        let [_, pid, stdinFd, stdoutFd, stderrFd] =
            GLib.spawn_async_with_pipes(null, args, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD | GLib.SpawnFlags.SEARCH_PATH, null)

        let stdout = new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true })
        let outReader = new Gio.DataInputStream({ base_stream: stdout })

        let stderr = new Gio.UnixInputStream({ fd: stderrFd, close_fd: true })
        let errReader = new Gio.DataInputStream({ base_stream: stderr })

        GLib.close(stdinFd)

        return new Promise((resolve, reject) => {
            const cw = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
                try {
                    const [out, err] = [[], []]
                    let line = null

                    while (([line] = outReader.read_line(null)) != null && line != null) if (line)
                        out.push('' + line)
                    stdout.close(null)

                    while (([line] = errReader.read_line(null)) != null && line != null) if (line)
                        err.push('' + line)
                    stderr.close(null)

                    GLib.source_remove(cw)
                    global.log("resolved:" + JSON.stringify(args))
                    resolve([out, err])
                } catch (e) {
                    reject(e)
                }
            })
            Mainloop.timeout_add(timeout, () => reject(new Error(`${args} timeout in ${timeout}ms`)))
        })
    },

    exec_detach(args) {
        let [_, pid] = GLib.spawn_async(null, args, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD | GLib.SpawnFlags.SEARCH_PATH, null)
        return pid == 0 ? Promise.reject() : Promise.resolve(pid)
    },

    notify(title, content, pop=true) {
        return new Promise((resolve, reject) => {
            try {
                const source = new Message.Source("GS-extension-shadowsocks", "mail-send-symbolic")
                Main.messageTray.add(source)
                const notification = new Message.Notification(source, title, content)
                notification.connect('activated', resolve)
                pop ? source.notify(notification) : source.pushNotification(notification)
            } catch (e) {
                reject(e)
            }
        })
    },

    // try to get url with and without proxy, whichever is faster
    netget(url) {
        const i1 = this.fcount++
        const i2 = this.fcount++
        const p1 = this.exec(['curl', '-s', '-L', url, '-o', `/tmp/gnome-shell-extension-shadowsocks-temp-${i1}`])
            .then(() => {
                const data = GLib.file_get_contents(`/tmp/gnome-shell-extension-shadowsocks-temp-${i1}`)[1] + ''
                return data.trim().length ? data : Promise.reject(new Error("curl error"))
            })
        const p2 = this.exec(['curl', '-s', '-L', url, '-o', `/tmp/gnome-shell-extension-shadowsocks-temp-${i2}`,
                                      '--socks5-hostname', `127.0.0.1:${this.config.preference.localport}`])
            .then(() => {
                const data = GLib.file_get_contents(`/tmp/gnome-shell-extension-shadowsocks-temp-${i2}`)[1] + ''
                return data.trim().length ? data : Promise.reject(new Error("curl error"))
            })
        return this.race_success(p1, p2)
    },

    // return when first success, or all fails
    race_success(...ps) {
        return new Promise((resolve, reject) => {
            const errors = []
            for (let i = 0; i < ps.length; i++)
                ps[i].then(x => resolve(x)).catch(e => {
                    errors[i] = e
                    if (Object.keys(errors).length == ps.length)
                        reject(errors)
                })
        })
    },

    // settings
    settings: (() => {
        let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        )

        let schemaObj = schemaSource.lookup(Me.metadata['settings-schema'], true)
        if (!schemaObj) throw new Error(Me.metadata.uuid + ": schema not found.")

        return new Gio.Settings({ settings_schema: schemaObj })
    })(),

    system_proxy: new Gio.Settings({ schema: "org.gnome.system.proxy" }),

    get system_proxy_mode() {
        switch (this.system_proxy.get_string('mode')) {
            case 'none': return 'Direct'
            case 'auto': return 'PAC'
            case 'manual': return 'Proxy'
        }
    },

    set system_proxy_mode(mode) {
        switch (mode) {
            case 'Direct': this.system_proxy.set_string('mode', 'none'); break
            case 'PAC':    this.system_proxy.set_string('mode', 'auto'); break
            case 'Proxy':  this.system_proxy.set_string('mode', 'manual'); break
        }
    },

    config: (() => {
        try {
            return JSON.parse(GLib.file_get_contents(Me.dir.get_child('configs').get_child('config.json').get_path())[1])
        } catch {
            return { hosts: [], subscriptions: [], preference: { localport: 1080 } }
        }
    })(),

    get servers() {
        const servers = {}
        for (const host of this.config.hosts) {
            const h = { name: host.addr, group: 'default', ...host }
            const l = servers[h.group] || []
            servers[h.group] = [...l, h]
        }

        for (const host of JSON.parse(this.settings.get_string('proxies'))) {
            const l = servers[host.group] || []
            servers[host.group] = [...l, host]
        }

        return servers
    },

    // manage shadowsocks
    method: 'ss-local',

    async set_method() {
        const [out, err] = await shadowsocks.exec(['sslocal', '--version'])
        global.log(JSON.stringify([out, err]))
        if (out[0].startsWith('Shadowsocks'))
            this.method = 'sslocal'
    },

    get running_instance() {
        try {
            const pid = GLib.file_get_contents("/tmp/gnome-shell-extension-shadowsocks.pid")[1]
            const data = GLib.file_get_contents(`/proc/${pid}/cmdline`)[1]
            const list = String.fromCharCode.apply(null, data).split('\0')
            global.log(JSON.stringify(list))
            if (list[0] == 'v2socks') {
                return {
                    addr: list[2].split(':')[0],
                    port: list[2].split(':')[1],
                    passwd: list[3],
                    method: 'vmess'
                }
            } else {
                return { // who would bother writing a correct parser when everyone use 8cores * 5Ghz processors?
                    addr: list[list.indexOf('-s')+1],
                    port: list[list.indexOf('-p')+1],
                    passwd: list[list.indexOf('-k')+1],
                    method: list[list.indexOf('-m')+1]
                }
            }
        } catch {
            return null
        }
    },

    mark_running_instance(servers) {
        const {addr, port} = this.running_instance || {}
        for (const group in servers) for (const server of servers[group])
            if (server.addr == addr && server.port.toString() == port)
                server.is_current = true
        return servers
    },

    start_shadowsocks(server) {
        if (server.method == "vmess") {
            const args = ['setsid', 'v2socks', 'vmess', `${server.addr}:${server.port}`, server.passwd, this.config.preference.localport.toString()]
            const record_pid = pid => GLib.file_set_contents("/tmp/gnome-shell-extension-shadowsocks.pid", pid.toString())
            return this.running_instance ? this.stop_shadowsocks().then(x => this.exec_detach(args).then(record_pid)) : this.exec_detach(args).then(record_pid)
        } else if (this.method == 'sslocal') {
            const args = ['sslocal', '-s', server.addr, '-p', server.port.toString(), '-k', server.passwd, '-m', server.method,
                                     '-l', this.config.preference.localport.toString(), '-d', this.running_instance ? 'restart' : 'start',
                                     '--pid-file', "/tmp/gnome-shell-extension-shadowsocks.pid", '--log-file', "/dev/null"]
            return this.exec(args)
        } else {
            const args = ['ss-local', '-s', server.addr, '-p', server.port.toString(), '-k', server.passwd, '-m', server.method,
                                      '-l', this.config.preference.localport.toString(), '-f', "/tmp/gnome-shell-extension-shadowsocks.pid"]
            return this.running_instance ? this.stop_shadowsocks().then(x => this.exec(args)) : this.exec(args)
        }
    },

    async stop_shadowsocks() {
        if (!this.running_instance) {
            return Promise.reject()
        }

        if (this.running_instance.method == 'vmess' || this.method == 'ss-local') {
            return this.exec(['kill', GLib.file_get_contents("/tmp/gnome-shell-extension-shadowsocks.pid")[1] + ''])
        } else {
            return this.exec(['sslocal', '-d', 'stop', '--pid-file', "/tmp/gnome-shell-extension-shadowsocks.pid"])
        }
    },

    // subscription
    async parse_surge(url) {
        const data = await this.netget(url)
        const m = data.match(/\[Proxy\]([^]+?)\n\n/)
        const list = (m ? m[1] : data.slice(0, -1)).split('\n')
        
        const reg = /^\s*(.+?)\s*=.+?,(.+?),(\d+?),(.+?),(.+?)(,|\s*$)/
        return list.map(x => x.match(reg)).filter(x => x)
            .map(([_, name, addr, port, method, passwd]) => ({ name, addr, port, method, passwd }))
    },

    async parse_v2rayN(url) {
        const data = GLib.base64_decode(await this.netget(url)) + ''
        return data.trim().split('\n')
            .filter(x => x.startsWith('vmess://'))
            .map(x => JSON.parse(GLib.base64_decode(x.slice(8)) + ''))
            .map(({ ps, add, port, id }) => ({ name: ps, addr: add, port: port, passwd: id, method: 'vmess'}))
    },

    async sync_all_subscriptions() {
        const servers = []
        const tasks = this.config.subscriptions.map(async sub => {
            switch (sub.type.toLowerCase()) {
                case 'surge':
                    for (const server of await this.parse_surge(sub.url))
                        servers.push({...server, ...sub})
                    break
                case 'v2rayn':
                    for (const server of await this.parse_v2rayN(sub.url))
                        servers.push({...server, ...sub})
                    break
                default: throw new Error("configuration error")
            }
        })
        await Promise.all(tasks)
        this.settings.set_string('proxies', JSON.stringify(servers))
        return servers
    },

    // UI
    create_button() {
        let button = new PanelMenu.Button(null)
        let hbox = new St.BoxLayout() // box is necessary for highlighting when active
        let icon = new St.Icon({ icon_name: 'mail-send-symbolic', style_class: 'system-status-icon' })
        hbox.add_child(icon)
        button.actor.add_actor(hbox)
        button.actor.add_style_class_name('panel-status-button')
        button.actor.connect('button-press-event', () => this.update_menu())
        Main.panel.addToStatusArea('shadowsocks-manager', button)

        return button
    },

    update_menu() {
        const menu = this.panel_button.menu
        menu.removeAll()

        const servers = this.mark_running_instance(this.servers)
    
        if (Object.values(servers).every(x => x.every(x=>!x.is_current)))
            this.stop_shadowsocks().catch(e=>null) // stop the running instance whose profile has been removed
        
        if (Object.keys(servers).length)
            for (const group in servers)
                menu.addMenuItem((() => {
                    const item = new PopupMenu.PopupSubMenuMenuItem(group)
                    for (const server of servers[group]) {
                        const child = new PopupMenu.PopupMenuItem(server.name)
                        if (server.is_current) {
                            child.setOrnament(PopupMenu.Ornament.DOT)
                            item.setOrnament(PopupMenu.Ornament.DOT)
                            child.connect("activate", () => this.stop_shadowsocks()
                                .then(() => this.notify(`${server.name} disconnected`))
                                .catch(e => this.notify("error", e.toString())))
                        } else {
                            child.connect("activate", () => this.start_shadowsocks(server)
                                .then(() => this.notify(`switched to ${server.name}`))
                                .catch(e => this.notify("error", e.toString())))
                        }
                        item.menu.addMenuItem(child)
                    }
                    return item
                })())
        else
            menu.addMenuItem((() => {
                const item = new PopupMenu.PopupMenuItem("Settings")
                item.connect("activate", () => this.exec(['xdg-open', Me.dir.get_child('configs').get_path()]))
                return item
            })())

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        // menu.addMenuItem((() => {
        //     const item = new PopupMenu.PopupMenuItem("debug")
        //     item.connect("activate", () => {
        //         this.exec(['xdg-open', Me.dir.get_child('configs').get_path()])
        //     })
        //     return item
        // })())

        menu.addMenuItem((() => {
            const item = new PopupMenu.PopupMenuItem("Sync Subscriptions")
            item.connect("activate", () => this.sync_all_subscriptions()
                .then(ss => this.notify('sync complete', `${ss.length} servers from ${this.config.subscriptions.length} subscriptions`))
                .catch(e => this.notify('sync failed', e.toString())))
            return item
        })())

        menu.addMenuItem((() => {
            const mode = this.system_proxy_mode
            const item = new PopupMenu.PopupSubMenuMenuItem("System Proxy Mode:  " + mode)
            for (const opt of ["Direct", "PAC", "Proxy"]) {
                const child = new PopupMenu.PopupMenuItem(opt)
                child.connect('activate', () => this.system_proxy_mode = opt)
                child.setOrnament(opt == mode ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE)
                item.menu.addMenuItem(child)
            }
            return item
        })())
    }
}

shadowsocks.set_method().catch(e=>null)

// API: build the entry button
function enable() {
    shadowsocks.panel_button = shadowsocks.create_button()
    shadowsocks.update_menu()
}

// API: destroy the entry button
function disable() {
    shadowsocks.panel_button.destroy()
}
