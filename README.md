## About
The current report code in the web browser can take some time to run on big reports. This daemon pre-process specified reports at specified time to cut off the wait for a result, there's still the possibility to ask the report to be generated on the spot but you'll have to wait for it.

## How to use
Create a service account in karuta, if possible with a randomly generated login and password and fill the 'access' file, ensure that reading the content is not permitted for everyone on the system

To run the daemon
>node main.js

In the browser
>http://localhost:8081/client/config.html

[screenshot]

## Debian Install

curl -sL https://deb.nodesource.com/setup_4.x | bash -
apt-get install nodejs
npm install -g node-static
ln -s /usr/lib/node_modules /usr/local/node_modules
npm install -g request
npm install -g jsdom
npm install -g xmldom


## TODO
- Backport the report code and ensure that it is compatible with a browser
- Configuration when the service is running on another computer different from the backend
