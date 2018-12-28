Gnome Extension Shadowsocks
===========================

My first GJS project. This project is only for learning developing Gnome extensions.

Still under developing, features incomplete.

## Features

- easily switch proxy from system tray
- support Surge/SSR subscription

## Install

TODO

## Dependencies

This extension makes use of following commands, make sure they are accessible in path.

- `sslocal`: shadowsocks executable
- `xdg-open`: to open the configure directory for you
- `curl`: to sync subscription

## Credits

Forked from [gnome-shell-extension-services-systemd](https://github.com/petres/gnome-shell-extension-services-systemd),
which is under GPLv3.

## TODO

- [ ] SSR subscription
- [ ] allow overwriting parameters of subscription
- [ ] timeout for curl?
- [ ] host local pac file
- [ ] add switch for proxy modes
- [ ] show pings?
- [ ] show status on icon when disconnected?
- [ ] allow multiple PAC/manuals, set them by ourself
