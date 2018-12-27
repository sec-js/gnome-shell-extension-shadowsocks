const { GLib, Gio, St } = imports.gi
const Mainloop = imports.mainloop

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu

const Me = imports.misc.extensionUtils.getCurrentExtension()
const ss = Me.imports.main.shadowsocks

const popup_widget = {
    init() {
        this.panelButton = this.create_button()
    },

    create_button() {
        let button = new PanelMenu.Button()
        let icon = new St.Icon({ icon_name: 'system-run-symbolic', style_class: 'system-status-icon' })

        button.actor.add_actor(icon)
        button.actor.add_style_class_name('panel-status-button')
        button.actor.connect('button-press-event', () => ss.parse_surge("http://aliyun.ylxdzsw.com:8080/surge.txt"))
        Main.panel.addToStatusArea('shadowsocksManager', button)

        return button
    },

    destroy() {
        this.panelButton.destroy()
    },

    _showHello() {
        let text = ss.settings.get_boolean('test') ? 'true' : "Hello, world!"
        this.toast(text)        
    }
}

function enable() {
    popup_widget.init()
}

function disable() {
    popup_widget.destroy()
}
