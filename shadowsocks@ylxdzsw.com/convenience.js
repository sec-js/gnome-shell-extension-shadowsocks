const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;


function getSettings() {
    let extension = ExtensionUtils.getCurrentExtension()
    let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        extension.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    )

    let schemaObj = schemaSource.lookup(extension.metadata['settings-schema'], true)
    if (!schemaObj)
        throw new Error(extension.metadata.uuid + ": schema not found.")

    return new Gio.Settings({ settings_schema: schemaObj })
}
								  
