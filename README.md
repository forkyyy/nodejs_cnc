<h2>NodeJS SSH2 Command and Control server to launch DDoS attacks using API</h2>

<h3>Coded by forky (tg: ***@yfork***)</h3>


<h1>Installation:</h1>

```sh
curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -
sudo apt -y install nodejs
npm i ssh2 axios
```

<h1>Setup:</h1>

<p>Update servers.json to your methods/API servers</p>
<p>Update users.json to your username/passwords and concurrents/maxboot</p>
<p>Update line 21 to change the botnet name</p>
<p>Update line 22 to change the botnet port</p>



<h1>Firewall:</h1>

<h3>Its recommended to make a firewall for your CNC in case its open to the public
Here is a simple iptables ratelimit that together with a OVH/Path server should block most handshake DDoS attacks
Replace 2222 with your CNC port</h3>


iptables -A INPUT -p tcp --dport 2222 -m connlimit --connlimit-above 1 --connlimit-mask 32 -j REJECT --reject-with tcp-reset

iptables -A INPUT -p tcp --dport 2222 -m recent --set --name ratelimit

iptables -A INPUT -p tcp --dport 2222 -m recent --update --seconds 1 --hitcount 10 --rttl --name ratelimit -j DROP
