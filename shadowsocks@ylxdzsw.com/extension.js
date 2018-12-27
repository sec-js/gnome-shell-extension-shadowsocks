const { GLib, Gio, St } = imports.gi
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const Me = imports.misc.extensionUtils.getCurrentExtension()
const ss = Me.imports.main.shadowsocks

// the entry button, which contains the popup menu
const popup_widget = {
    init() {
        this.panel_button = this.create_button()
    },

    create_button() {
        let button = new PanelMenu.Button()
        button._init(null) // this call and an argument is necessary to show menu on click
        let hbox = new St.BoxLayout() // box is necessary for highlighting when active
        let icon = new St.Icon({ icon_name: 'system-run-symbolic', style_class: 'system-status-icon' })
        hbox.add_child(icon)
        button.actor.add_actor(hbox)
        button.actor.add_style_class_name('panel-status-button')
        button.actor.connect('button-press-event', () => this.rebuild_menu())
        // ss.parse_surge("http://aliyun.ylxdzsw.com:8080/surge.txt")`
        Main.panel.addToStatusArea('shadowsocks-manager', button)

        return button
    },

    rebuild_menu() {
        const menu = this.panel_button.menu
        menu.removeAll()

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        if (true) {
            const l = new PopupMenu.PopupMenuItem("Add systemd services ...")
            menu.addMenuItem(l)
        }
    },

    destroy() {
        this.panel_button.destroy()
    },

    _showHello() {
        let text = ss.settings.get_boolean('test') ? 'true' : "Hello, world!"
        this.toast(text)        
    }
}

// show the entry button
function enable() {
    popup_widget.init()
}

// hide the entry button
function disable() {
    popup_widget.destroy()
}

// class StackWindow(Gtk.Window):

//     def __init__(self):
//         Gtk.Window.__init__(self, title="Stack Demo")
//         self.set_border_width(10)

//         vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
//         self.add(vbox)

//         stack = Gtk.Stack()
//         stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
//         stack.set_transition_duration(1000)
        
//         checkbutton = Gtk.CheckButton("Click me!")
//         stack.add_titled(checkbutton, "check", "Check Button")
        
//         label = Gtk.Label()
//         label.set_markup("<big>A fancy label</big>")
//         stack.add_titled(label, "label", "A label")

//         stack_switcher = Gtk.StackSwitcher()
//         stack_switcher.set_stack(stack)
//         vbox.pack_start(stack_switcher, True, True, 0)
//         vbox.pack_start(stack, True, True, 0)

// win = StackWindow()
// win.connect("destroy", Gtk.main_quit)
// win.show_all()
// Gtk.main()