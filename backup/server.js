//change to import
import express from 'express';
//const express = require('express');
import http from 'http';
import { Server } from 'socket.io';
//const socketIO = require('socket.io');
import dotenv from 'dotenv';
// require('dotenv').config();
// const { AzureOpenAI } = require('@azure/openai');
import { AzureOpenAI } from "openai";
//include fs
import fs from 'fs';
//load env variables
dotenv.config();
printTime();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const userHistories = new Map();

// Serve static files from public directory
app.use(express.static('public'));



function printTime(input1) {
    if (input1 == null) { input1="";}
    var now1 = new Date();
    now1.setHours(now1.getHours()-8);
    console.log(input1 + ": " + now1.toUTCString());
}   

async function callAzureOpenAI(message, settings, file1, history = []) {
    try {
        var openai = null;
        if (settings.model === "o1"){
                //set new environment variables
                process.env.OPENAI_BASE_URL = process.env.O1_BASE_URL;
                settings.model = "o1-prpr-use2";
                openai = new AzureOpenAI({
                    apiKey: process.env.O1_KEY,
                    baseURL: process.env.O1_ENDPOINT,
                    apiVersion: "2024-11-01-preview",
                });
 
            }
            else{
                process.env.OPENAI_BASE_URL = process.env.GPT4O_BASE_URL2;
                openai = new AzureOpenAI({
                    apiKey: process.env.GPT4O_KEY2,
                    baseURL: process.env.GPT4O_ENDPOINT2,
                    apiVersion: "2024-02-15-preview",
                });

            }
        // Print file as a string
        console.log('Calling Azure with file:', file1 ? file1.slice(0, 100) : 'No file');
        // Print the settings as a string
        console.log('Calling Azure OpenAI temp:', message, settings.temperature);
        console.log('Calling Azure OpenAI max_tokens:', settings.max_tokens);
        console.log('Calling Azure OpenAI model:', settings.model);
        console.log('Calling Azure OpenAI base:', process.env.OPENAI_BASE_URL);
        console.log('Calling Azure OpenAI system_prompt:', settings.system_prompt);
        let m1 = history.slice(); // Copy the chat history

        if (settings.system_prompt) {
            m1.unshift({ role: "system", content: settings.system_prompt });
        }
        if (file1) {
            //m1.push({ role: "user", content: message });
            m1.push({ role: "user", content: [{ type: "image_url", image_url: "data:image/jpeg;base64," + file1 }] });
        } else {
            //m1.push({ role: "user", content: message });
        }

        console.log("Calling Azure OpenAI with messages:", m1);
        // log the start time
        printTime("call start");
        var completion = null;
        if (settings.model === "o1-prpr-use2"){
            completion = await openai.chat.completions.create({
            model: settings.model,
            messages: m1,
            temperature: settings.temperature,
            max_completion_tokens: settings.max_tokens
            });
        }
        else{
                completion = await openai.completions.create({
                model: settings.model,
                messages: m1,
                temperature: settings.temperature,
                max_tokens: settings.max_tokens
            });
        }
        //console.log
        printTime("call end");
        return completion;
    } catch (error) {
        console.error('Error calling Azure OpenAI:', error);
        return 'Sorry, I encountered an error processing your request.';
    }
}
// set port to the environment variable or 3000
var port = process.env.PORT || 3000;
var url = "http://localhost:" + port+"/";
// Socket.IO connection handling
io.on('connection', (socket) => {
    
    console.log('A user connected at ' + socket.client.conn.remoteAddress);
    console.log("\n" + url  + "\n");
    // console.log(socket.client);
    // check if the user has a chat history
    if (!userHistories.has(socket.id))
    {
        userHistories.set(socket.id, []); // Initialize chat history for the user
    }

    socket.on('chat message', async (data) => {
        console.log(userHistories);
        const response = await callAzureOpenAI(data.message, data.settings, data.file, data.history);
        const userHistory = userHistories.get(socket.id);
        userHistory.push({ role: 'user', content: data.message });
        userHistory.push({ role: 'assistant', content: response.choices[0].message.content });
        io.emit('bot response', response);
    });

    socket.on('clear chat', () => {
        userHistories.set(socket.id, []); // Clear chat history for the user
        console.log('Chat history cleared for user:', socket.id);
    });

    socket.on('save file', (data) => {
        console.log('Saving file:', data.name);
        console.log('Data:', data.content);
        const filePath = './'+ data.name+'_prompts.txt';
        fs.writeFile(filePath, data.content, (err) => {
            if (err) {
                console.error('Error saving file:', err);
                socket.emit('file saved', { success: false, message: 'Error saving file' });
            } else {
                console.log('File saved successfully');
                socket.emit('file saved', { success: true, message: 'File saved successfully' });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log("\n" + url  + "\n");
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
console.log(`Server starting on port ${PORT}`);
console.log("\n" + url  + "\n");
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});