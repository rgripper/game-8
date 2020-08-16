# game-8

Navigating to external node modules in VSCode is not yet available.
https://yarnpkg.com/advanced/editor-sdks
https://github.com/microsoft/vscode/issues/75559
https://marketplace.visualstudio.com/items?itemName=arcanis.vscode-zipfs

Update your rust install with
`rustup update`

### Commands

-   `sim:build` builds sim package
-   `net:build` builds shared net package (TODO: review spliting into a server and a client if tree shaking doesnt remove client deps on server websocket impl)
