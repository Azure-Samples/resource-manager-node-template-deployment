/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var expandTilde = require('expand-tilde');
var msRestAzure = require('ms-rest-azure');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;

_validateEnvironmentVariables();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var publicSSHKeyPath = process.argv[2] || "~/.ssh/id_rsa.pub";
var resourceClient;
//Sample Config
var randomIds = {};
var location = 'eastus';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var deploymentName = _generateRandomId('testdeployment', randomIds);
var dnsLabelPrefix = _generateRandomId('testdnslable', randomIds);

///////////////////////////////////////
//Entrypoint for the sample script   //
///////////////////////////////////////

msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials) {
  if (err) return console.log(err);
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  // Work flow of this sample:
  // 1. create a resource group 
  // 2. load a VM template and deploy it.
  // 3. delete deployed resource(optional)
  // 4. delete a resource group(optional)
  
  async.series([
    function (callback) {
      //Task 1
      createResourceGroup(function (err, result, request, response) {
        if (err) {
          return callback(err);
        }
        callback(null, result);
      });
    },
    function (callback) {
      //Task 2
      loadTemplateAndDeploy(function (err, result, request, response) {
        if (err) {
          return callback(err);
        }
        console.log(util.format('\nDeployed template %s : \n%s', deploymentName, util.inspect(result, { depth: null })));
        callback(null, result);
      });
    }
  ], 
  // Once above operations finish, cleanup and exit.
  function (err, results) {
    if (err) {
      console.log(util.format('\n??????Error occurred in one of the operations.\n%s', 
          util.inspect(err, { depth: null })));
    } else {
      //console.log(util.format('\n######You can browse the website at: https://%s.', results[4].enabledHostNames[0]));
    }
    console.log('\n###### Exit ######');
    console.log(util.format('Please execute the following script for cleanup:\nnode cleanup.js %s', resourceGroupName, deploymentName));
    process.exit();
  });
});


// Helper functions
function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
  console.log('\nCreating resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function loadTemplateAndDeploy(callback) {
  try {
    var templateFilePath = path.join(__dirname, "templates/template.json");
    var template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
    var publicSSHKey = fs.readFileSync(expandTilde(publicSSHKeyPath), 'utf8');
  } catch (ex) {
    return callback(ex);
  }
  
  console.log('\nLoaded template from template.json');
  var parameters = {
    "sshKeyData": {
      "value": publicSSHKey
    },
    "vmName": {
      "value": "azure-deployment-sample-vm"
    },
    "dnsLabelPrefix": {
      "value": dnsLabelPrefix
    }
  };
  var deploymentParameters = {
    "properties": {
      "parameters": parameters,
      "template": template,
      "mode": "Incremental"
    }
  };
  
  console.log(util.format('\nDeploying template %s : \n%s', deploymentName, util.inspect(template, { depth: null })));
  return resourceClient.deployments.createOrUpdate(resourceGroupName, 
                                                             deploymentName, 
                                                             deploymentParameters, 
                                                             callback);
}

function deleteDeployment(callback) {
  console.log(util.format('\nDeleting deployment %s in resource group %s'), 
    deploymentName, resourceGroupName);
  return resourceClient.deployments.deleteMethod(resourceGroupName, deploymentName, callback);
}

function deleteResourceGroup(callback) {
  console.log('\nDeleting resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);
}

function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
  if (!process.env['DOMAIN']) envs.push('DOMAIN');
  if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
  if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
  if (envs.length > 0) {
    throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
  }
}

function _generateRandomId(prefix, exsitIds) {
  var newNumber;
  while (true) {
    newNumber = prefix + Math.floor(Math.random() * 10000);
    if (!exsitIds || !(newNumber in exsitIds)) {
      break;
    }
  }
  return newNumber;
}
