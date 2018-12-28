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
        let icon = new St.Icon({ icon_name: 'mail-send-symbolic', style_class: 'system-status-icon' })
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

        if (true) {
            menu.addMenuItem((() => {
                const item = new PopupMenu.PopupMenuItem("Settings")
                return item
            })())
        } else {
            ss.toast("fuck")
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())

        menu.addMenuItem((() => {
            const item = new PopupMenu.PopupMenuItem("Sync Subscriptions")
            return item
        })())

        menu.addMenuItem((() => {
            const mode = ss.system_proxy_mode
            const item = new PopupMenu.PopupSubMenuMenuItem("System Proxy Mode:  " + mode, true)
            for (const opt of ["Direct", "PAC", "Proxy"]) {
                const child = new PopupMenu.PopupMenuItem(opt)
                child.connect('activate', () => ss.system_proxy_mode = opt)
                child.setOrnament(opt == mode ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE)
                item.menu.addMenuItem(child)
            }
            return item
        })())
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
