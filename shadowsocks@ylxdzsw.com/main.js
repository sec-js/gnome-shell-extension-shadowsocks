const { GLib, GObject, Gio, St } = imports.gi

const Main = imports.ui.main
const Mainloop = imports.mainloop
const Me = imports.misc.extensionUtils.getCurrentExtension()

const shadowsocks = {
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

    async parse_surge(url) {
        return this.toast(url)
        global.log("requesting "+url)

        const [out, err] = await this.exec(["curl", "-L", url])
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

    set_system_proxy_mode(mode) {
        switch (mode) {
            case 'Direct': this.system_proxy.set_string('mode', 'none'); break
            case 'PAC':    this.system_proxy.set_string('mode', 'auto'); break
            case 'Proxy':  this.system_proxy.set_string('mode', 'manual'); break
        }
    }
}