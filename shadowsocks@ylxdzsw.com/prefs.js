const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function buildPrefsWidget() {
    const widget = new Gtk.Grid()
    widget._init()
    widget.margin = 12
    widget.row_spacing = 6
    widget.set_orientation(Gtk.Orientation.VERTICAL)
    widget.add(new Gtk.Label({ label: "fuck" }))
    widget.show_all()
    return widget
}
