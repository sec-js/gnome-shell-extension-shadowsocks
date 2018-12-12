const Gio = imports.gi.Gio
const St = imports.gi.St
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

function getSettings() {
    let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    )

    let schemaObj = schemaSource.lookup(Me.metadata['settings-schema'], true)
    if (!schemaObj)
        throw new Error(Me.metadata.uuid + ": schema not found.")

    return new Gio.Settings({ settings_schema: schemaObj })
}

class ShadowsocksManager {
    constructor() {
        this.add_button()
    }

    add_button() {
        this.panelButton = new PanelMenu.Button()
        let hbox = new St.BoxLayout()
        let icon = new St.Icon({icon_name: 'system-run-symbolic', style_class: 'system-status-icon'})
        hbox.add_child(icon)

        this.panelButton.actor.add_actor(hbox)
        this.panelButton.actor.add_style_class_name('panel-status-button')

        this.panelButton.actor.connect('button-press-event', this._showHello)
        Main.panel.addToStatusArea('shadowsocksManager', this.panelButton)
    }

    _connect() {
        Main.panel.actor.reactive = true
        this.signalId = Main.panel.actor.connect('button-release-event', this._showHello)
    }

    _disconnect() {
        Main.panel.actor.disconnect(this.signalId)
    }

    _showHello() {
        let settings = getSettings()
        let text = settings.get_boolean('test') ? 'true' : "Hello, world!"
    
        let label = new St.Label({ style_class: 'helloworld-label', text: text })
        let monitor = Main.layoutManager.primaryMonitor
        global.stage.add_actor(label)
        label.set_position(Math.floor (monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2))
        Mainloop.timeout_add(3000, () => { label.destroy() })
    }
}

let shadowsocksManager

function enable() {
    shadowsocksManager = new ShadowsocksManager()
    shadowsocksManager._connect()
}

function disable() {
    shadowsocksManager._disconnect()
}
