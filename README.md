# game-8

### Commands
-   `yarn install:all` runs `yarn install` in packages and the root
-   `<package name>:build` builds the respective package


### Misc

Update your rust install with
`rustup update`

### Issues

Navigating to external node modules in VSCode is not yet available.
https://yarnpkg.com/advanced/editor-sdks
https://github.com/microsoft/vscode/issues/75559
https://marketplace.visualstudio.com/items?itemName=arcanis.vscode-zipfs

Sometimes yarn install fails. Close and reopen VS Code, it will work.

### TODOs

-   `net:build` review spliting into a server and a client if tree shaking doesnt remove client deps on server websocket impl
