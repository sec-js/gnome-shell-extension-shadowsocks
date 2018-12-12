const { Gio, St, Soup } = imports.gi
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
        button.actor.connect('button-press-event', () => this.toast("Hello World!"))
        Main.panel.addToStatusArea('shadowsocksManager', button)

        return button
    },

    parse_surge(url) {
        const sess = new Soup.SessionAsync()
        sess.add_feature(new Soup.ProxyResolverDefault())
        
        const query = Soup.Message.new('GET', url)
        return new Promise((resolve, reject) => {
            sess.queue_message(query, (_, msg) => {
                this.toast('' + msg.status_code)
                if (msg.status_code != 200) return reject(msg.status_code)
                try {
                    const list = query.response_body.data.match(/\[Proxy\]([^]+?)\n\n/)[1].split('\n')
                    //for (const item of list) {
                    const item = list[0]
                        const [_, name, domain, port, crypt, passwd] = item.match(/^\s*(.+?)\s*=.+?,(.+?),(\d+?),(.+?),(.+?)/)
                        this.toast(name)
                    //}
                } catch (e) {
                    reject(e)
                }
            })
        })
    },

    destroy() {
        this.panelButton.destroy()
    },

    toast(msg) {
        let label = new St.Label({ text: msg })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor (monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => label.destroy())
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
