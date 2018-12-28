const { GLib, GObject, Gio, St } = imports.gi
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu
const Message = imports.ui.messageTray

const Me = imports.misc.extensionUtils.getCurrentExtension()

const shadowsocks = {
    // utils
    toast(msg) {
        let label = new St.Label({ text: msg })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor(monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => label.destroy())
    },

    exec(args) {
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
                    resolve([out, err])
                } catch (e) {
                    reject(e)
                }
            })
        })
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

    config: JSON.parse(GLib.file_get_contents(Me.dir.get_child('configs').get_child('config.json').get_path())[1]),

    get servers() {
        const servers = {}
        for (const host of this.config.hosts) {
            const h = { name: host.addr, group: 'default', ...host }
            const l = servers[h.group] || []
            servers[h.group] = [...l, h]
        }
        // TODO: add subscripted servers
        return servers
    },

    // manage shadowsocks

    // subscription
    async parse_surge(url) {
        return this.toast(url)

        const [out, err] = await this.exec(["curl", "-L", url])
        const data = out.join('\n')


        const m = out.match(/\[Proxy\]([^]+?)\n\n/)
        

        // const list = (m ? m[1] : out.slice(0, -1)).split('\n')
        // for (const item of list) {
        //     const [_, name, domain, port, crypt, passwd] = item.match(/^\s*(.+?)\s*=.+?,(.+?),(\d+?),(.+?),(.+?)/)
        //     global.log(name)
        // }
    },
    
    // UI
    create_button() {
        let button = new PanelMenu.Button()
        button._init(null) // this call and an argument is necessary to show menu on click
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

        if (Object.keys(this.servers).length)
            for (const group in this.servers)
                menu.addMenuItem((() => {
                    const item = new PopupMenu.PopupSubMenuMenuItem(group, true)
                    for (const server of this.servers[group]) {
                        const child = new PopupMenu.PopupMenuItem(server.name)
                        child.connect("activate", () => this.toast("switch to " + server.addr))
                        item.menu.addMenuItem(child)
                    }
                    return item
                })()) 
        else
            menu.addMenuItem((() => {
                const item = new PopupMenu.PopupMenuItem("Settings")
                item.connect("activate", () => this.toast(JSON.stringify(this.config)))
                return item
            })())

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        menu.addMenuItem((() => {
            const item = new PopupMenu.PopupMenuItem("Sync Subscriptions")
            return item
        })())

        menu.addMenuItem((() => {
            const mode = this.system_proxy_mode
            const item = new PopupMenu.PopupSubMenuMenuItem("System Proxy Mode:  " + mode, true)
            for (const opt of ["Direct", "PAC", "Proxy"]) {
                const child = new PopupMenu.PopupMenuItem(opt)
                child.connect('activate', () => this.system_proxy_mode = opt)
                child.setOrnament(opt == mode ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE)
                item.menu.addMenuItem(child)
            }
            return item
        })())
    },

    _showHello() {
        let text = this.settings.get_boolean('test') ? 'true' : "Hello, world!"
        this.toast(text)        
    }
}

// API: build the entry button
function enable() {
    shadowsocks.panel_button = shadowsocks.create_button()
    shadowsocks.update_menu()
}

// API: destroy the entry button
function disable() {
    shadowsocks.panel_button.destroy()
}
