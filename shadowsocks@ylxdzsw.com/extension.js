const Gio = imports.gi.Gio
const St = imports.gi.St
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

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
        if (!schemaObj)
            throw new Error(Me.metadata.uuid + ": schema not found.")
    
        return new Gio.Settings({ settings_schema: schemaObj })
    },

    create_button() {
        let button = new PanelMenu.Button()
        let icon = new St.Icon({icon_name: 'system-run-symbolic', style_class: 'system-status-icon'})

        button.actor.add_actor(icon)
        button.actor.add_style_class_name('panel-status-button')
        button.actor.connect('button-press-event', () => this._showHello())
        Main.panel.addToStatusArea('shadowsocksManager', button)

        return button
    },

    destroy() {
        this.panelButton.destroy()
    },

    _showHello() {
        let text = this.settings.get_boolean('test') ? 'true' : "Hello, world!"

        let label = new St.Label({ style_class: 'helloworld-label', text: text })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor (monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => label.destroy())
    }
}

function enable() {
    shadowsocksManager.init()
}

function disable() {
    shadowsocksManager.destroy()
}
