/** 
 * @file TeamSpeak3.js
 * @copyright David Kartnaller 2017
 * @license GNU GPLv3 
 * @author David Kartnaller <david.kartnaller@gmail.com> 
 */ 
const TS3Query = require(__dirname+"/transport/TS3Query") 
const TeamSpeakClient = require(__dirname+"/property/Client") 
const TeamSpeakChannel = require(__dirname+"/property/Channel") 
const TeamSpeakServerGroup = require(__dirname+"/property/ServerGroup") 
const Promise = require("bluebird") 
const events = require("events") 
const util = require("util") 

/**
 * Main TeamSpeak Query Class
 * @class
 */
class TeamSpeak3 { 
    /** 
     * Represents a TeamSpeak Server Instance
     * @constructor 
     * @version 1.0 
     * @param {object} [config] - The Configuration Object 
     * @param {string} [config.host='127.0.0.1'] - The Host on which the TeamSpeak Server runs 
     * @param {number} [config.queryport=10011] - The Queryport on which the TeamSpeak Server runs 
     * @param {number} [config.serverport=9987] - The Serverport on which the TeamSpeak Instance runs 
     * @param {string} [config.username] - The username to authenticate with the TeamSpeak Server 
     * @param {string} [config.password] - The password to authenticate with the TeamSpeak Server 
     * @param {string} [config.nickname] - The Nickname the Client should have 
     * @param {boolean} [config.antispam=false] - Whether the AntiSpam should be activated or deactivated 
     * @param {number} [config.antispamtimer=350] - The time between every command for the antispam (in ms) 
     * @param {boolean} [config.keepalive=true] - Whether the Query should seen a keepalive 
     */ 
    constructor(config = {}) { 
        events.EventEmitter.call(this) 
        this._config = { 
            host: config.host || "127.0.0.1", 
            queryport: parseInt(config.queryport) || 10011, 
            serverport: parseInt(config.serverport) || false, 
            username: config.username || false, 
            password: config.password || false, 
            nickname: config.nickname || false, 
            antispam: Boolean(config.antispam), 
            antispamtimer: parseInt(config.antispamtimer) || 350, 
            keepalive: Boolean(config.keepalive) || true 
        } 
		this._clients = {}
		this._channels = {}
		this._servergroups = {}
		this._channelgroups = {}

        this._ts3 = new TS3Query(this._config.host, this._config.queryport) 
        if (this._config.keepalive) this._ts3.keepAlive() 
        if (this._config.antispam) this._ts3.antiSpam(this._config.antispamtimer) 


        this._ts3.on("connect", () => { 
            var exec = [] 
            if (typeof(this._config.username) == "string") 
                this.login(this._config.username, this._config.password)
            if (typeof(this._config.serverport) == "number") 
                this.use(this._config.serverport)
            if (typeof(this._config.nickname) == "string") 
                exec.push(this.execute("clientupdate", {client_nickname: this._config.nickname}))
            Promise.all(exec)
                .then(r => this.emit("ready"))
                .catch(e => this.emit("error", e))
        }) 
        this._ts3.on("close", e => this.emit("close", e)) 
    } 


    /** 
     * Sends a command to the TeamSpeak Server. 
     * @version 1.0 
     * @async 
     * @param {string} Command - The Command which should get executed on the TeamSpeak Server 
     * @param {object} [Object] - Optional the Parameters 
     * @param {object} [Array] - Optional Flagwords 
     * @returns {Promise<object>} Promise object which returns the Information about the Query executed 
     */ 
    execute() { 
        return this._ts3.execute(...arguments) 
    } 


    /** 
     * Subscribes to an Event. 
     * @version 1.0 
     * @async 
     * @param {string} event - The Event on which should be subscribed 
     * @param {number} [id] - The Channel ID 
     * @returns {Promise} Promise object 
     */
    registerEvent(event, id = 0) { 
        return this.execute("servernotifyregister", {event: event, id: 0}) 
    } 


    /** 
     * Authenticates with the TeamSpeak 3 Server instance using given ServerQuery login credentials.
     * @version 1.0 
     * @async 
     * @param {string} username - The Username which you want to login with 
     * @param {string} password - The Password you want to login with
     * @returns {Promise} Promise object 
     */
    login(username, password) { 
        return this.execute("login", [username, password]) 
    } 


    /** 
     * Deselects the active virtual server and logs out from the server instance.
     * @version 1.0 
     * @async 
     * @returns {Promise} Promise object 
     */
    logout() { 
        return this.execute("logout") 
    } 


    /** 
     * Displays the servers version information including platform and build number.
     * @version 1.0 
     * @async 
     * @returns {Promise<object>} Promise object
     */ 
    version() { 
        return this.execute("version") 
    } 


    /** 
     * Displays detailed connection information about the server instance including uptime, number of virtual servers online, traffic information, etc.
     * @version 1.0 
     * @async 
     * @returns {Promise<object>} Promise object
     */ 
    hostInfo() { 
        return this.execute("hostinfo") 
    } 


    /** 
     * Displays the server instance configuration including database revision number, the file transfer port, default group IDs, etc.
     * @version 1.0 
     * @async 
     * @returns {Promise<object>} Promise object
     */ 
    instanceInfo() { 
        return this.execute("instanceinfo") 
    } 


    /** 
     * Changes the server instance configuration using given properties.
     * @version 1.0 
     * @async 
     * @param {object} properties - The stuff you want to change
     * @returns {Promise<object>} Promise object
     */ 
    instanceEdit(properties) { 
        return this.execute("instanceedit", properties) 
    } 


    /** 
     * Displays a list of IP addresses used by the server instance on multi-homed machines.
     * @version 1.0 
     * @async 
     * @returns {Promise<object>} Promise object
     */ 
    bindingList() { 
        return this.execute("bindinglist") 
    } 


    /** 
     * Selects the virtual server specified with sid or port to allow further interaction. The ServerQuery client will appear on the virtual server and acts like a real TeamSpeak 3 Client, except it's unable to send or receive voice data.
     * @version 1.0 
     * @async
     * @param {number} port - The Port the Server runs on
     * @returns {Promise<object>} Promise object
     */ 
    use(port) { 
        return this.execute("use", {port: port}) 
    } 


    /** 
     * Displays information about your current ServerQuery connection including your loginname, etc.
     * @version 1.0 
     * @async 
     * @returns {Promise} Promise object which provides the Information about the QueryClient 
     */ 
    whoami() { 
        return this.execute("whoami") 
    } 


    /** 
     * Displays detailed configuration information about the selected virtual server including unique ID, number of clients online, configuration, etc.
     * @version 1.0 
     * @async 
     * @returns {Promise} Promise object
     */ 
    serverInfo() { 
        return this.execute("serverinfo") 
    }


    /** 
     * Stops the virtual server specified with sid. Depending on your permissions, you're able to stop either your own virtual server only or all virtual servers in the server instance
     * @version 1.0 
     * @async 
     * @param {number} sid - Server id you want to stop
     * @returns {Promise} Promise object
     */ 
    serverStop(sid) { 
        return this.execute("serverstop", {sid: sid}) 
    }


    /** 
     * Starts the virtual server specified with sid. Depending on your permissions, you're able to start either your own virtual server only or all virtual servers in the server instance.     * @version 1.0 
     * @async 
     * @param {number} sid - Server id you want to start
     * @returns {Promise} Promise object
     */ 
    serverStart(sid) { 
        return this.execute("serverstart", {sid: sid}) 
    }


    /** 
     * Displays detailed connection information about the selected virtual server including uptime, traffic information, etc.
     * @version 1.0 
     * @async 
     * @returns {Promise} Promise object
     */ 
    connectionInfo() { 
        return this.execute("serverrequestconnectioninfo") 
    }


    /** 
     * Retrieves a Single Client by the given Client ID
     * @version 1.0 
     * @async 
     * @param {number} clid - The Client Id
     * @returns {Promise<object>} Promise object which returns the Client Object or undefined if not found
     */ 
    getClientByID(clid) {
        return new Promise((fulfill, reject) => {
            this.clientList({clid: clid})
                .then(clients => fulfill(clients[0]))
                .catch(reject)
        })
    } 


    /** 
     * Retrieves a Single Client by the given Client Database ID
     * @version 1.0 
     * @async 
     * @param {number} cldbid - The Client Database Id
     * @returns {Promise<object>} Promise object which returns the Client Object or undefined if not found
     */ 
    getClientByDBID(cldbid) {
        return new Promise((fulfill, reject) => {
            this.clientList({client_database_id: cldbid})
                .then(clients => fulfill(clients[0]))
                .catch(reject)
        })
    } 


    /** 
     * Retrieves a Single Client by the given Client Unique Identifier
     * @version 1.0 
     * @async 
     * @param {string} uid - The Client Unique Identifier
     * @returns {Promise<object>} Promise object which returns the Client Object or undefined if not found
     */ 
    getClientByUID(uid) {
        return new Promise((fulfill, reject) => {
            this.clientList({client_unique_identifier: uid})
                .then(clients => fulfill(clients[0]))
                .catch(reject)
        })
    }


    /** 
     * Displays a list of server groups available. Depending on your permissions, the output may also contain global ServerQuery groups and template groups.
     * @version 1.0 
     * @async 
     * @param {object} filter - Filter Object 
     * @returns {Promise<object>} Promise object which returns an Array of TeamSpeak Server Groups
     */ 
    serverGroupList(filter = {}) { 
        return this.execute(
            "servergrouplist"
        ).then(groups => {
            return this._handleCache(this._servergroups, groups, "sgid", TeamSpeakServerGroup)
        }).then(groups => {
            return this.constructor._filter(groups, filter)
        }).then(groups => {
            return new Promise((fulfill, reject) => {
                fulfill(groups.map(g => {
                    return this._servergroups[g.sgid]
                }))
            })
        })
    }


    /** 
     * Lists all Channels with a given Filter
     * @version 1.0 
     * @async 
     * @param {object} filter - Filter Object 
     * @returns {Promise<object>} Promise object which returns an Array of TeamSpeak Channels
     */ 
    channelList(filter = {}) { 
        return this.execute( 
            "channellist", 
            ["-topic", "-flags", "-voice", "-limits", "-icon"] 
        ).then(channels => {
            return this._handleCache(this._channels, channels, "cid", TeamSpeakChannel)
        }).then(channels => {
            return this.constructor._filter(channels, filter)
        }).then(channels => {
            return new Promise((fulfill, reject) => {
                fulfill(channels.map(c => {
                    return this._channels[c.cid]
                }))
            })
        })
    }


    /** 
     * Lists all Clients with a given Filter
     * @version 1.0 
     * @async 
     * @param {object} filter - Filter Object 
     * @returns {Promise<object>} Promise object which returns an Array of TeamSpeak Clients 
     */ 
    clientList(filter = {}) { 
        return this.execute( 
            "clientlist", 
            ["-uid", "-away", "-voice", "-times", "-groups", "-info", "-icon", "-country"] 
        ).then(clients => {
            return this._handleCache(this._clients, clients, "clid", TeamSpeakClient)
        }).then(clients => {
            return this.constructor._filter(clients, filter)
        }).then(clients => {
            return new Promise((fulfill, reject) => {
                fulfill(clients.map(c => {
                    return this._clients[c.clid]
                }))
            })
        })
    } 


    /** 
     * Closes the ServerQuery connection to the TeamSpeak 3 Server instance.
     * @version 1.0 
     * @async 
     * @returns {Promise} Promise object 
     */ 
    quit() { 
        return this.execute("quit") 
    }


    /** 
     * Parses the whole Cache by given Objects
     * @version 1.0 
     * @async 
     * @private
     * @param {object} cache - The Cache Object
     * @param {object} list - The List to check against the Cache
     * @param {string} key - The Key used to identify the Object inside the Cache
     * @param {object} class - The Class which should be used
     * @returns {Promise} Promise object 
     */ 
    _handleCache(cache, list, key, Class) {
        if (!Array.isArray(list)) var list = [list]
        return new Promise((fulfill, reject) => {
            var remainder = Object.keys(cache)
            list.forEach(l => {
                if (remainder.indexOf(l[key]) >= 0) 
                    return remainder.splice(remainder.indexOf(l[key]), 1)
                cache[l[key]] = new Class(this, l)
            })
            remainder.forEach(r => {
                delete cache[r]
            })
            fulfill(list)
        })
    }


    /** 
     * Filters an Object with given Option
     * @version 1.0 
     * @private 
     * @static 
     * @async 
     * @param {object} obj - The Object which should get filtered 
     * @param {object} filt - Filter Object 
     * @returns {Promise<object>} Promise object which returns an Array of TeamSpeak Clients 
     */ 
    static _filter(obj, filt) { 
        return new Promise((fulfill, reject) => { 
            if (!(obj instanceof Array)) obj = [obj] 
            if (Object.keys(filt).length == 0) 
                return fulfill(obj) 
            fulfill(obj.filter(o => { 
                for (var k in filt) { 
                    if (!(k in o)) return false 
                    if (filt[k] instanceof RegExp) return o[k].match(filt[k]) 
                    switch (typeof o[k]) { 
                        case "number": return o[k] === parseInt(filt[k]) 
                        case "string": 
                        case "object": return o[k].match(filt[k]) 
                    } 
                } 
            })) 
        }) 
    } 
} 




util.inherits(TeamSpeak3, events.EventEmitter) 
module.exports = TeamSpeak3