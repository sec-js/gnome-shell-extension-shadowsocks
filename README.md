Gnome Extension Shadowsocks
===========================

My first GJS project. This project is only for learning developing Gnome extensions.

Still under developing, features incomplete.

## Features

- easily switch proxy from system tray
- support Surge/SSR subscription

## Install

```sh
cd /tmp
git clone https://github.com/ylxdzsw/gnome-shell-extension-services-systemd 
mv gnome-shell-extension-services-systemd/shadowsocks@ylxdzsw.com ~/.local/share/gnome-shell/extensions
```

Then press `Alt+F2` and enter `r` to reload, and enable it in Tweak Tool.

## Dependencies

This extension makes use of following commands, make sure they are accessible in path.

- `sslocal`: shadowsocks executable
- `xdg-open`: to open the configure directory for you
- `curl`: to sync subscription

## Configuration

This extension uses a JSON file for configuration, since it is much easier to copy and share than gsettings. This
extension reads `configs/config.json` under the its installation directory. `config.example.json` in the same folder can
be copied as a start point, which contains the descriptions of each settings and itself is valid in format (but the
server is not accessible, of course).

## Credits

Forked from [gnome-shell-extension-services-systemd](https://github.com/petres/gnome-shell-extension-services-systemd),
which is under GPLv3.

## TODO

- [ ] SSR subscription
- [ ] timeout for curl?
- [ ] host local pac file
- [ ] show pings?
- [ ] show status on icon?
- [ ] allow multiple PAC/manuals, set them by ourself
- [ ] support shadowsocks-libev (ss-local)