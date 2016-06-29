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
var publicSSHKeyPath = "~/.ssh/id_rsa.pub";
var resourceClient;
//Sample Config
var randomIds = {};
var location = 'westus';
//var resourceGroupName = _generateRandomId('testrg', randomIds);
var resourceGroupName = "testrg4811";
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
  // 2. load a VM template from templates/template.json file
  // 3. deploy VM resources.
  // 7. delete deployed resource(optional)
  // 8. delete a resource group(optional)
  
  async.series([
    //function (callback) {
    //  //Task 1
    //  createResourceGroup(function (err, result, request, response) {
    //    if (err) {
    //      return callback(err);
    //    }
    //    callback(null, result);
    //  });
    //},
    function (callback) {
      //Task 2
      loadTemplateAndDeploy(function (err, result, request, response) {
        if (err) {
          return callback(err);
        }
        console.log(util.format('\nLoaded template from template.json : \n%s', util.inspect(result, { depth: null })));
        callback(null, result);
      });
    }
    //function (callback) {
    //  //Task 3
    //  updateResourceGroup(function (err, result, request, response) {
    //    if (err) {
    //      return callback(err);
    //    }
    //    console.log(util.format('\nUpdated Resource Groups %s : \n%s',
    //        resourceGroupName, util.inspect(result, { depth: null })));
    //    callback(null, result);
    //  });
    //},
    //function (callback) {
    //  //Task 4
    //  createResource(function (err, result, request, response) {
    //    if (err) {
    //      return callback(err);
    //    }
    //    console.log(util.format('\nCreated a Key Vault resource in Resource Groups %s : \n%s',
    //    resourceGroupName, util.inspect(result, { depth: null })));
    //    callback(null, result);
    //  });
    //}
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
    console.log(util.format('Please execute the following script for cleanup:\nnode cleanup.js %s', resourceGroupName));
    process.exit();
  });
});


// Helper functions
function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
  console.log('\nCreating resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function createResource(callback) {
  var keyvaultParameter = {
    location : "West US",
    properties : {
      sku : {
        family : 'A',
        name : 'standard'
      },
      accessPolicies : [],
      enabledForDeployment: true,
      enabledForTemplateDeployment: true,
      tenantId : domain
    },
    tags : {}
  };
  console.log(util.format('\nCreating Key Vault resource %s in resource group %s'), 
    resourceName, resourceGroupName);
  return resourceClient.resources.createOrUpdate(resourceGroupName, 
                                                 resourceProviderNamespace, 
                                                 parentResourcePath, 
                                                 resourceType, 
                                                 resourceName, 
                                                 apiVersion, 
                                                 keyvaultParameter, 
                                                 callback);
}

function loadTemplateAndDeploy(callback) {
  try {
	var templateFilePath = path.join(__dirname, "templates/template.json");
	console.log(publicSSHKeyPath);
    var template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
    var publicSSHKey = fs.readFileSync(expandTilde(publicSSHKeyPath), 'utf8');
	console.log(publicSSHKey);
  } catch (ex) {
    callback(ex);
  }

  var properties = {
    "template": template,
    "mode": "Incremental",
    'sshKeyData': publicSSHKey,
    'vmName': 'azure-deployment-sample-vm',
    'dnsLabelPrefix': dnsLabelPrefix
  };
  var deploymentParameters = {
    "properties": properties
  };
  return resourceClient.deployments.createOrUpdate(resourceGroupName, 
                                                             deploymentName, 
                                                             deploymentParameters, 
                                                             callback);
}

function deleteResource(callback) {
  console.log(util.format('\nDeleting resource %s in resource group %s'), 
    resourceName, resourceGroupName);
  return resourceClient.resources.deleteMethod(resourceGroupName, 
                                               resourceProviderNamespace, 
                                               parentResourcePath, 
                                               resourceType, 
                                               resourceName, 
                                               apiVersion, 
                                               callback);
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
