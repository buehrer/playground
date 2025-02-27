const socket = io();
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const debugPanel = document.getElementById('debug-panel');
const debugOutput = document.getElementById('debug-output');

let encodedFile = "";
let chatHistory = [];

// require the prism library
// const Prism = require('prismjs');

document.getElementById('file-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            encodedFile = e.target.result.split(',')[1]; // Get the base64 encoded string
            console.log(encodedFile); // For debugging purposes
        };
        reader.readAsDataURL(file);

        // Display the file name
        document.getElementById('file-name').textContent = file.name;
    }
});

document.getElementById('message-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        if (event.shiftKey) {
            // Add a newline if Shift+Enter is pressed
            event.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "\n" + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        } else {
            // Submit the form if Enter is pressed without Shift
            event.preventDefault();
            document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        }
    }
});

document.getElementById('chat-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const message = document.getElementById('message-input').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('max-tokens').value);
    const model = document.getElementById('model').value;
    const systemPrompt = document.getElementById('system-prompt').value;

    const data = {
        message: message,
        file: encodedFile,
        settings: {
            temperature: temperature,
            max_tokens: maxTokens,
            model: model,
            system_prompt: systemPrompt
        },
        history: chatHistory
    };

    // Append user message to chat history and emit the message
    appendMessage('user', message);
    chatHistory.push({ role: 'user', content: message });
    socket.emit('chat message', data);
    document.getElementById('message-input').value = ''; // Clear the input field
});

socket.on('bot response', function(response) {
    // Append assistant response to chat history
    var res1 = response.hasOwnProperty("choices") ? response.choices[0].message.content : response.message.content;
    
    console.log(res1);
    console.log('here');
    chatHistory.push({ role: 'assistant', content: res1});
    
    // check for code triple ticks
    var code = false;
    
    console.log('checking for code blocks');
    if (res1.includes("```"))
    {
        console.log('found code block');
        //the code starts with the first triple tick
        //the code ends with the second triple tick
        //replace the code with an empty string
        starting_pos = res1.indexOf("```");
        console.log("starting pos is " + starting_pos);
        ending_pos = res1.indexOf("```", starting_pos+2);
        console.log("ending pos is " + ending_pos);
        codestring = res1.substring(starting_pos + 3, ending_pos);
        console.log("code string is " + codestring);
        rendered_code = codestring;
        // if the rendered code starts with a newline, remove it

        //rendered_code = codestring.replace("\\n", "<br/>"); // Replace \n with <br>
        rendered_code = Prism.highlight(rendered_code, Prism.languages.javascript, 'javascript');
        rendered_code = rendered_code.replace(/(?:\r\n|\r|\n)/g, '&#13;'); // Replace \n with <br>
        
        console.log("\n******  rendered code is " + rendered_code);
        if (rendered_code.startsWith("&#13;#"))
        {
            rendered_code = rendered_code.substring(5);
        }
        res1 = res1.substring(0, starting_pos) + "<pre><code class=\"language-javascript\">" + rendered_code + "</code></pre>" + res1.substring(ending_pos + 3);
        //res1 = res1.substring(0, starting_pos) + rendered_code +  res1.substring(ending_pos + 3);
        console.log(res1);
    }
    appendMessage('assistant', res1);
    // Display the full JSON response in the debug panel
    debugOutput.textContent = "RESPONSE\n"+JSON.stringify(response, null, 2) + "\n"+debugOutput.textContent;
    debugPanel.style.display = 'block';
    renderLatex();
    renderCode();
});

function renderLatex()
{
    // Render LaTeX equations
    MathJax.typeset();
}

function renderCode()
{
    // Highlight code blocks
    Prism.highlightAll();
}

function appendMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = message.replace(/\n/g, '<br>'); // Replace \n with <br>
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function saveSettings() {
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('max-tokens').value);
    const model = document.getElementById('model').value;
    const systemPrompt = document.getElementById('system-prompt').value;

    const settings = {
        temperature: temperature,
        max_tokens: maxTokens,
        model: model,
        system_prompt: systemPrompt
    };

    socket.emit('update settings', settings);
    
    // Hide the settings panel
    document.getElementById('settings-panel').style.display = 'none';
    
    // Optional: Show a brief notification instead of the alert
    // You can remove this if you don't want any notification
    const notification = document.createElement('div');
    notification.textContent = 'Settings saved';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = '#4CAF50';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '1000';
    
    // Append the notification to the body
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

function clearChatHistory() {
    chatHistory = [];
    chatBox.innerHTML = '';
    socket.emit('clear chat'); // Emit event to clear chat history on the server
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function showEditor() {
    name1=getCookie('Name');
    if (name1=="" || name1==null)
    {
        name1="greg";
    }
    document.getElementById('name').value=name1;
    content=getCookie('editor-content');
    decoded1=atob(content);
    document.getElementById('editor-content').value=decoded1;
    document.getElementById('editor-panel').style.display = 'block';
}

function saveFile() {
    const content = document.getElementById('editor-content').value;
    const encodedContent = btoa(content);
    console.log('content is ' + encodedContent);
    const name = document.getElementById('name').value;
    const data = {
        name: name,
        content: content
    };
    socket.emit('save file', data);
    // 
    setCookie('editor-content', encodedContent, 1000); 
    setCookie('Name', name, 1000); // Save content to a cookie for 7 days
    document.getElementById('editor-panel').style.display = 'none';
}

function hideEditor()
{
    document.getElementById('editor-panel').style.display = 'none';
}