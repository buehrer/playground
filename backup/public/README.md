# Install node.js for windows

```
    # installs fnm (Fast Node Manager)
    winget install Schniz.fnm

    # configure fnm environment
    fnm env --use-on-cd | Out-String | Invoke-Expression

    # download and install Node.js
    fnm use --install-if-missing 22

    # verifies the right Node.js version is in the environment
    node -v # should print `v22.11.0`
    # verifies the right npm version is in the environment
    npm -v # should print `10.9.0` 
```

# You can also go here: 
https://nodejs.org/en/download/prebuilt-installer

# Install dependencies
```
sync repo
npm init -y
npm install express mongoose dotenv openai cors
```

# Run the app
```
node server.js
``` 

# Finally, open index.html in your browser

Also, sometimes you need to add node to your path variable.

```
set PATH=%PATH%;C:\Program Files\nodejs
```

# To Do
1. make multi-user
2. show debug repsonse json in side panel
3. 
