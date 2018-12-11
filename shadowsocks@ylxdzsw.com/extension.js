const St = imports.gi.St;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gio = imports.gi.Gio;

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

function _showHello() {
    let settings = getSettings();
    let text = settings.get_boolean('test') ? "true" : "Hello, world!";

    let label = new St.Label({ style_class: 'helloworld-label', text: text });
    let monitor = Main.layoutManager.primaryMonitor;
    global.stage.add_actor(label);
    label.set_position(Math.floor (monitor.width / 2 - label.width / 2), Math.floor(monitor.height / 2 - label.height / 2));
    Mainloop.timeout_add(3000, () => { label.destroy(); });
}

// Put your extension initialization code here
function init(metadata) {
    log ('Example extension initalized');
}

let signalId;

function enable() {
    log ('Example extension enabled');

    Main.panel.actor.reactive = true;
    signalId = Main.panel.actor.connect('button-release-event', _showHello);
}

function disable() {
    log ('Example extension disabled');

    if (signalId) {
        Main.panel.actor.disconnect(signalId);
        signalId = 0;
    }
}
