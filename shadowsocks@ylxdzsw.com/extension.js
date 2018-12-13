const { GLib, Gio, St } = imports.gi
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const Me = imports.misc.extensionUtils.getCurrentExtension()

const shadowsocksManager = {
    init() {
        this.settings = this.get_settings()
        this.panelButton = this.create_button()
    },

    get_settings() {
        let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        )
    
        let schemaObj = schemaSource.lookup(Me.metadata['settings-schema'], true)
        if (!schemaObj) throw new Error(Me.metadata.uuid + ": schema not found.")
    
        return new Gio.Settings({ settings_schema: schemaObj })
    },

    create_button() {
        let button = new PanelMenu.Button()
        let icon = new St.Icon({icon_name: 'system-run-symbolic', style_class: 'system-status-icon'})

        button.actor.add_actor(icon)
        button.actor.add_style_class_name('panel-status-button')
        button.actor.connect('button-press-event', () => this.parse_surge("http://aliyun.ylxdzsw.com:8080/surge.txt"))
        Main.panel.addToStatusArea('shadowsocksManager', button)

        return button
    },

    destroy() {
        this.panelButton.destroy()
    },

    async parse_surge(url) {
        global.log("requesting "+url)

        const [out, err] = await this.exec_async(["curl", "-L", url])
        const data = out.join('\n')


        global.log("before fuck")
        const m = out.match(/\[Proxy\]([^]+?)\n\n/)
        global.log("fuck")
        
        global.log(m)


        // const list = (m ? m[1] : out.slice(0, -1)).split('\n')
        // for (const item of list) {
        //     const [_, name, domain, port, crypt, passwd] = item.match(/^\s*(.+?)\s*=.+?,(.+?),(\d+?),(.+?),(.+?)/)
        //     global.log(name)
        // }
    },

    toast(msg) {
        let label = new St.Label({ text: msg })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor (monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => label.destroy())
    },

    exec_async(args) {
        let [_, pid, stdinFd, stdoutFd, stderrFd] =
            GLib.spawn_async_with_pipes(null, args, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD | GLib.SpawnFlags.SEARCH_PATH, null)

        let stdout = new Gio.UnixInputStream({fd: stdoutFd, close_fd: true})
        let outReader = new Gio.DataInputStream({base_stream: stdout})

        let stderr = new Gio.UnixInputStream({fd: stderrFd, close_fd: true})
        let errReader = new Gio.DataInputStream({base_stream: stderr})

        GLib.close(stdinFd)

        return new Promise((resolve, reject) => {
            try {
                const cw = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
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
                })
            } catch (e) {
                reject(e)
            }
        })
    },

    _showHello() {
        let text = this.settings.get_boolean('test') ? 'true' : "Hello, world!"
        this.toast(text)        
    }
}

function enable() {
    shadowsocksManager.init()
}

function disable() {
    shadowsocksManager.destroy()
}
