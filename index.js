var instance_skel = require('../../instance_skel');
var parseString = require('xml2js').parseString;
var util = require('util');
var debug;
var log;

var MUTESTATE = [{
    id: 'true',
    label: 'Mute'
},
{
    id: 'false',
    label: 'Unmute'
}
];

var LAYOUT = [{
    id: 'allEqual',
    label: 'allEqual'
},
{
    id: 'speakerOnly',
    label: 'speakerOnly'
},
{
    id: 'telepresence',
    label: 'Prominent(Overlay)'
},
{
    id: 'stacked',
    label: 'stacked'
},
{
    id: 'allEqualQuarters',
    label: 'allEqualQuarters'
},
{
    id: 'allEqualNinths',
    label: 'allEqualNinths'
},
{
    id: 'allEqualSixteenths',
    label: 'allEqualSixteenths'
},
{
    id: 'allEqualTwentyFifths',
    label: 'allEqualTwentyFifths'
},
{
    id: 'onePlusFive',
    label: 'onePlusFive'
},
{
    id: 'onePlusNine',
    label: 'onePlusNine'
},
{
    id: 'automatic',
    label: 'automatic'
},
{
    id: 'onePlusN',
    label: 'onePlusN'
}
];

var calllist = [];
var callleglist = [];

function instance(system, id, config) {
    var self = this;
    
    // super-constructor
    instance_skel.apply(this, arguments);
    
    self.actions(); // export actions
    
    return self;
}

instance.prototype.updateConfig = function(config) {
    var self = this;
    self.config = config;
    self.actions();
    
    //stop the polling and restart it with the new interval
    if (this.pollAPI) {
        clearInterval(this.pollAPI);
    }
    self.initAPI.bind(this)();
}

instance.prototype.init = function() {
    var self = this;
    debug = self.debug;
    log = self.log;
    
    self.status(self.STATE_OK);
    
    if (this.pollAPI) {
        clearInterval(this.pollAPI);
    }
    self.initAPI.bind(this)();
}

// Return config fields for web config
instance.prototype.config_fields = function() {
    var self = this;
    return [{
        type: 'textinput',
        id: 'host',
        label: 'Server IP',
        width: 12
    },
    {
        type: 'textinput',
        id: 'port',
        label: 'Port',
        width: 12
    },
    /*{
        type: 'textinput',
        id: 'auth',
        label: 'Basic Auth',
        width: 12
    }*/
    {
        type: 'textinput',
        id: 'username',
        label: 'User',
        width: 12
    },
    {
        type: 'textinput',
        id: 'password',
        label: 'Password',
        width: 12
    },
    {
        type: 'text',
        id: 'apiPollInfo',
        width: 12,
        label: 'API Poll Interval warning',
        value: 'Adjusting the API Polling Interval can impact performance. <br />' +
        'A lower invterval allows for more responsive feedback, but may impact CPU usage. <br />' +
        'See the help section for more details.'
    },
    {
        type: 'textinput',
        id: 'apiPollInterval',
        label: 'API Polling interval (ms) (default: 10000, min: 250)',
        width: 12,
        default: 5000,
        min: 250,
        max: 10000,
        regex: this.REGEX_NUMBER
    }
    
]
}

instance.prototype.initAPI = function() {
    var self = this;
    authstring = Buffer.from(self.config.username + ':' + self.config.password).toString('base64');
    var cmd;
    var request = require('request');
    var options;
    
    
    const getCalls = () => {
        //console.log(self.callleglist);
        //console.log(self.calllist);
        self.actions();
        self.callleglist = [];
        self.calllist = [];
        
        cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/';
        options = {
            'method': 'GET',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        request(options, function(error, response) {
            if (error !== null) {
                self.log('error', 'HTTP Request failed (' + error + ')');
                self.status(self.STATUS_ERROR, error);
                console.log(error);
            } else {
                self.status(self.STATUS_OK);
                //console.log(response.body);		
                parseString(response.body, function(err, result) {
                    //console.log(util.inspect(result, false, null));
                    if (result) {
                        var totalcalls = (result["calls"].$.total);
                        var iterations = Math.floor((((totalcalls) / 10 +1)));
                        //console.log ("Will Iterate = " + iterations);
                        if (iterations < 2){
                            //console.log ("Iterations less than 2");
                            if (totalcalls == '0'){
                                self.calllist.push({
                                    id: '0',
                                    label: 'No Calls Found'
                                });
                            }
                            else {
                                //console.log("Total Calls in Server = " + totalcalls);
                                for (i in (result["calls"].call)) {
                                    var name = (result["calls"].call[i].name);
                                    var callID = (result["calls"].call[i].$.id);
                                    //console.log(name + " = " + callID);
                                    self.calllist.push({
                                        id: callID,
                                        label: name
                                    });
                                }
                                
                            }
                        }
                        else {
                            // console.log ("Iterations more or equal to 2");
                            // first iterstion is already done.
                            //console.log ("Iteration 1");
                            for (i in (result["calls"].call)) {
                                var name = (result["calls"].call[i].name);
                                var callID = (result["calls"].call[i].$.id);
                                //console.log(name + " = " + callID);
                                self.calllist.push({
                                    id: callID,
                                    label: name
                                });
                            }
                            // next iterations
                            for (i = 1; i < iterations; i++) {
                                
                                //console.log("Iterating with offset " + i*10);
                                cmd3 = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/?offset=' + i*10;
                                options3 = {
                                    'method': 'GET',
                                    'rejectUnauthorized': false,
                                    'url': cmd3,
                                    'headers': {
                                        'Authorization': 'Basic' + authstring,
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    }
                                };
                                request(options3, function(error, response3) {
                                    if (error !== null) {
                                        self.log('error', 'HTTP Request failed (' + error + ')');
                                        self.status(self.STATUS_ERROR, error);
                                        console.log(error);
                                    } else {
                                        self.status(self.STATUS_OK);                                         
                                        parseString(response3.body, function(err, result3) {
                                            //console.log(util.inspect(result3, false, null));
                                            if (result3){
                                                if (result3["calls"].$.total != '0') {
                                                    for (i in (result3["calls"].call)) {
                                                        var name = (result3["calls"].call[i].name);
                                                        var callID = (result3["calls"].call[i].$.id);
                                                        //console.log(name + " = " + callID);
                                                        self.calllist.push({
                                                            id: callID,
                                                            label: name
                                                        });
                                                    }
                                                }
                                                else {
                                                    //console.log("No Calls on this Page");
                                                }
                                            }
                                            
                                        });
                                        
                                    }
                                });                                                           
                                
                            };
                        }
                    }
                });
                
            }
        });
        
        cmd2 = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/';
        options2 = {
            'method': 'GET',
            'rejectUnauthorized': false,
            'url': cmd2,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        request(options2, function(error, response2) {
            if (error !== null) {
                self.log('error', 'HTTP Request failed (' + error + ')');
                self.status(self.STATUS_ERROR, error);
                console.log(error);
            } else {
                self.status(self.STATUS_OK);
                //console.log(response2.body);		
                parseString(response2.body, function(err, result2) {
                    //console.log(util.inspect(result2, false, null));
                    if (result2) {
                        var totalcalllegs = (result2["callLegs"].$.total);
                        var iterations = Math.floor((((totalcalllegs) / 10 +1)));
                        //console.log ("Will Iterate = " + iterations);
                        //console.log("Total CallLegs in Server = " + totalcalllegs);
                        if (iterations < 2){
                            //console.log ("Iterations less than 2");
                            if (totalcalllegs == '0'){
                                self.callleglist.push({
                                    id: '0',
                                    label: 'No CallLegs Found'
                                });
                            }
                            else {
                                for (i in (result2["callLegs"].callLeg)) {
                                    var name = (result2["callLegs"].callLeg[i].name);
                                    var remotepty = (result2["callLegs"].callLeg[i].remoteParty);
                                    var callLegID = (result2["callLegs"].callLeg[i].$.id);
                                    var call = (result2["callLegs"].callLeg[i].call);
                                    var incall = null;    
                                    for (var i = 0; i < self.calllist.length; i++) {
                                        if (self.calllist[i].id == call) {
                                            incall = self.calllist[i];
                                            break;
                                        }
                                        else {
                                            incall = [
                                            { id: "null" , label: "null"}]
                                        }  
                                    }
                                    //console.log(name + " in " + incall.label)
                                    //console.log(name + " = " + callLegID  + " = " + remotepty );
                                    if (name != "") {
                                        self.callleglist.push({
                                            id: callLegID,
                                            label: name + " in " + incall.label
                                        });
                                    } else {
                                        self.callleglist.push({
                                            id: callLegID,
                                            label: remotepty + " in " + incall.label
                                        });
                                    }
                                }
                            }
                        }
                        else {
                            // console.log ("Iterations more or equal to 2");
                            // first iterstion is already done.
                            //console.log ("Iteration 1");
                            for (i in (result2["callLegs"].callLeg)) {
                                var name = (result2["callLegs"].callLeg[i].name);
                                var remotepty = (result2["callLegs"].callLeg[i].remoteParty);
                                var callLegID = (result2["callLegs"].callLeg[i].$.id);
                                var call = (result2["callLegs"].callLeg[i].call);
                                var incall = null;    
                                    for (var i = 0; i < self.calllist.length; i++) {
                                        if (self.calllist[i].id == call) {
                                            incall = self.calllist[i];
                                            break;
                                        }
                                        else {
                                            incall = [
                                            { id: "null" , label: "null"}]
                                        }
                                    }
                                //console.log(name + " = " + callLegID  + " = " + remotepty );
                                if (name != "") {
                                    self.callleglist.push({
                                        id: callLegID,
                                        label: name + " in " + incall.label
                                    });
                                } else {
                                    self.callleglist.push({
                                        id: callLegID,
                                        label: remotepty + " in " + incall.label
                                    });
                                }
                            }
                            // next iterations
                            for (i = 1; i < iterations; i++) {
                                
                                //console.log("Iterating with offset " + i*10);
                                cmd4 = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/?offset=' + i*10;
                                options4 = {
                                    'method': 'GET',
                                    'rejectUnauthorized': false,
                                    'url': cmd4,
                                    'headers': {
                                        'Authorization': 'Basic' + authstring,
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    }
                                };
                                request(options4, function(error, response4) {
                                    if (error !== null) {
                                        self.log('error', 'HTTP Request failed (' + error + ')');
                                        self.status(self.STATUS_ERROR, error);
                                        console.log(error);
                                    } else {
                                        self.status(self.STATUS_OK);
                                        parseString(response4.body, function(err, result4) {
                                            //console.log(util.inspect(result4, false, null));
                                            if (result4) {
                                                for (i in (result4["callLegs"].callLeg)) {
                                                    var name = (result4["callLegs"].callLeg[i].name);
                                                    var remotepty = (result4["callLegs"].callLeg[i].remoteParty);
                                                    var callLegID = (result4["callLegs"].callLeg[i].$.id);
                                                    //console.log(name + " = " + callLegID  + " = " + remotepty );
                                                    if (name != "") {
                                                        self.callleglist.push({
                                                            id: callLegID,
                                                            label: name
                                                        });
                                                    } else {
                                                        self.callleglist.push({
                                                            id: callLegID,
                                                            label: remotepty
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                        
                                    }
                                });                                                           
                                
                            };
                        }    
                    }
                });
            }
        });
        
    };
    
    if (this.pollAPI) {
        clearInterval(this.pollAPI);
    }
    
    
    if (self.config.apiPollInterval) {
        //console.log ("apiPollInterval = "  + self.config.apiPollInterval);
        this.pollAPI = setInterval(getCalls, this.config.apiPollInterval < 100 ? 100 : this.config.apiPollInterval);
    }  
}
// When module gets deleted
instance.prototype.destroy = function() {
    var self = this;
    debug("destroy");
        
    if (this.pollAPI) {
        clearInterval(this.pollAPI);
    }
    
}

instance.prototype.actions = function(system) {
    var self = this;
    self.setActions({
        'audioMute': {
            label: 'Participant Audio',
            options: [{
                type: 'dropdown',
                label: 'Call',
                id: 'callleg',
                default: '',
                choices: self.callleglist
            },
            {
                type: 'text',
                id: 'info',
                label: 'Paste callLeg bellow ONLY if you cant find the call in the list above',
                value: 'Paste callLeg bellow ONLY if you cant find the call in the list above'
            },
            {
                type: 'textinput',
                label: "callleg ID",
                id: 'callerID',
                default: ''
            },
            {
                type: 'dropdown',
                id: 'mute',
                label: 'State',
                width: 6,
                default: 'true',
                choices: MUTESTATE
            }
        ]
    },
    'videoMute': {
        label: 'Participant Video',
        options: [{
            type: 'dropdown',
            label: 'Call',
            id: 'callleg',
            default: '',
            choices: self.callleglist
        },
        {
            type: 'text',
            id: 'info',
            label: 'Paste callLeg bellow ONLY if you cant find the call in the list above',
            value: 'Paste callLeg bellow ONLY if you cant find the call in the list above'
        },
        {
            type: 'textinput',
            label: "callleg ID",
            id: 'callerID',
            default: ''
        },
        {
            type: 'dropdown',
            id: 'mute',
            label: 'State',
            width: 6,
            default: 'true',
            choices: MUTESTATE
        }
    ]
},
'callLayout': {
    label: 'Call Layout for all participants',
    options: [{
        type: 'dropdown',
        label: 'Call',
        id: 'call',
        default: '',
        choices: self.calllist
    },
    {
        type: 'text',
        id: 'info',
        label: 'Paste call ID bellow ONLY if you cant find the call in the list above',
        value: 'Paste call ID bellow ONLY if you cant find the call in the list above'
    },
    {
        type: 'textinput',
        label: "callID",
        id: 'callID',
        default: ''
    },
    {
        type: 'dropdown',
        id: 'layout',
        label: 'State',
        width: 12,
        default: 'automatic',
        choices: LAYOUT
    }
]
},
'callerLayout': {
    label: 'Call Layout for a single participant',
    options: [{
        type: 'dropdown',
        label: 'Call',
        id: 'callleg',
        default: '',
        choices: self.callleglist
    },
    {
        type: 'text',
        id: 'info',
        label: 'Paste callLeg bellow ONLY if you cant find the call in the list above',
        value: 'Paste callLeg bellow ONLY if you cant find the call in the list above'
    },
    {
        type: 'textinput',
        label: "callleg ID",
        id: 'callerID',
        default: ''
    },
    {
        type: 'dropdown',
        id: 'layout',
        label: 'State',
        width: 12,
        default: 'automatic',
        choices: LAYOUT
    }
]
},
'addParticipant': {
    label: 'Add a participant (or room) to a call',
    options: [{
        type: 'dropdown',
        label: 'Call',
        id: 'call',
        default: '',
        choices: self.calllist
    },
    {
        type: 'text',
        id: 'info',
        label: 'Paste call ID bellow ONLY if you cant find the call in the list above',
        value: 'Paste call ID bellow ONLY if you cant find the call in the list above'
    },
    {
        type: 'textinput',
        label: "callID",
        id: 'callID',
        default: ''
    },
    {
        type: 'textinput',
        label: "URI",
        id: 'uri',
        default: ''
    }
]
},
'dropParticipant': {
    label: 'Drop participant (or room) from a call',
    options: [{
        type: 'dropdown',
        label: 'Participant',
        id: 'callleg',
        default: '',
        choices: self.callleglist
    },
    {
        type: 'text',
        id: 'info',
        label: 'Paste callLeg bellow ONLY if you cant find the call in the list above',
        value: 'Paste callLeg bellow ONLY if you cant find the call in the list above'
    },
    {
        type: 'textinput',
        label: "callleg ID",
        id: 'callerID',
        default: ''
    }
]
},
'dropCall': {
    label: 'Drop a call (End Meeting)',
    options: [{
        type: 'dropdown',
        label: 'Call',
        id: 'call',
        default: '',
        choices: self.calllist
    },
    {
        type: 'text',
        id: 'info',
        label: 'Paste call ID bellow ONLY if you cant find the call in the list above',
        value: 'Paste call ID bellow ONLY if you cant find the call in the list above'
    },
    {
        type: 'textinput',
        label: "callID",
        id: 'callID',
        default: ''
    }
]
}
});
}

instance.prototype.action = function(action) {
    var self = this;
    authstring = Buffer.from(self.config.username + ':' + self.config.password).toString('base64');
    var cmd;
    var request = require('request');
    var options;
    
    if (action.action == 'audioMute') {
        
        if (action.options.callerID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callerID;
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callleg;
        }
        options = {
            'method': 'PUT',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic ' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                'rxAudioMute': action.options.mute
            }
        };
    } else if (action.action == 'videoMute') {
        
        if (action.options.callerID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callerID;
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callleg;
        }
        options = {
            'method': 'PUT',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                'rxVideoMute': action.options.mute
            }
        };
    } else if (action.action == 'callLayout') {
        
        if (action.options.callID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.callID + '/participants/*';
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.call + '/participants/*';
        }
        
        options = {
            'method': 'PUT',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                'layout': action.options.layout
            }
        };
    } else if (action.action == 'addParticipant') {
        
        if (action.options.callID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.callID + '/participants';
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.call + '/participants';
        }
        options = {
            'method': 'POST',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                'remoteParty': action.options.uri
            }
        };
    } else if (action.action == 'callerLayout') {
        
        if (action.options.callerID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callerID;
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callleg;
        }
        options = {
            'method': 'PUT',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                'chosenLayout': action.options.layout
            }
        };
    } else if (action.action == 'dropParticipant') {
        
        if (action.options.callerID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callerID;
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/callLegs/' + action.options.callleg;
        }
        options = {
            'method': 'DELETE',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
    } else if (action.action == 'dropCall') {
        if (action.options.callID != "") {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.callID;
        } else {
            cmd = 'https://' + self.config.host + ':' + self.config.port + '/api/v1' + '/calls/' + action.options.call;
        }
        
        options = {
            'method': 'DELETE',
            'rejectUnauthorized': false,
            'url': cmd,
            'headers': {
                'Authorization': 'Basic' + authstring,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
    }
    
    if (options !== undefined) {
        console.log(options);
        
        request(options, function(error, response) {
            if (error !== null) {
                self.log('error', 'HTTP Request failed (' + error + ')');
                self.status(self.STATUS_ERROR, error);
                console.log(error);
            } else {
                self.status(self.STATUS_OK);
            }
        });
    }
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;