<h2>NodeJS SSH2 Command and Control server to launch DDoS attacks using API</h2>

<h3>Coded by forky (tg: ***@yfork***)</h3>


<h1>Installation:</h1>

```sh
curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -
sudo apt -y install nodejs
npm i ssh2 axios
```

<h1>Setup:</h1>

<h3>Update servers.json to your methods/API servers<br>
Update users.json to your username/passwords and concurrents/maxboot<br>
Update line 21 to change the botnet name<br>
Update line 22 to change the botnet port</h3>



<h1>Firewall:</h1>

<h2>Protect your CNC by creating a firewall if it's accessible to the public</h2>
<h3><p>Use this straightforward iptables ratelimit in combination with an OVH/Path server to prevent most handshake DDoS attacks. Don't forget to substitute 2222 with your CNC port.</p></h3>


```sh
iptables -A INPUT -p tcp --dport 2222 -m connlimit --connlimit-above 1 --connlimit-mask 32 -j REJECT --reject-with tcp-reset
iptables -A INPUT -p tcp --dport 2222 -m recent --set --name ratelimit
iptables -A INPUT -p tcp --dport 2222 -m recent --update --seconds 1 --hitcount 10 --rttl --name ratelimit -j DROP
```
