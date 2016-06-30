---
services: azure-resource-manager
platforms: nodejs
author: hach
---

# Deploy an SSH Enabled VM with a Template in Node.js

This sample explains how to use Azure Resource Manager templates to deploy your Resources to Azure. It shows how to
deploy your Resources by using the Azure SDK for Node.js

When deploying an application definition with a template, you can provide parameter values to customize how the
resources are created. You specify values for these parameters either inline or in a parameter file.

## Tasks done in this sample

  1. create a resource group 
  2. load a VM template from template.json file and deploy it

## Running this sample

1. If you don't already have it, [get node.js](https://nodejs.org).

2. Clone the repository.

    ```
    git clone git@github.com:Azure-Samples/resource-manager-node-template-deployment.git
    ```

3. Install the dependencies.

    ```
    cd resource-manager-node-template-deployment
    npm install
    ```

4. Create an Azure service principal either through
    [Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
    [PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
    or [the portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/).

5. Set the following environment variables using the information from the service principle that you created.

    ```
    export AZURE_SUBSCRIPTION_ID={your subscription id}
    export CLIENT_ID={your client id}
    export APPLICATION_SECRET={your client secret}
    export DOMAIN={your tenant id as a guid OR the domain name of your org <contosocorp.com>}
    ```

    > [AZURE.NOTE] On Windows, use `set` instead of `export`.

6. Run the sample.

    ```
	// By default the script will use the ssh public key from your default ssh location
    node index.js [path/to/ssh_public_key]
    ```

7. To clean up after index.js, run the cleanup script.

    ```
    node cleanup.js <resourceGroupName> <deploymentName>
    ```

## What is index.js doing?

The sample creates, lists and updates a website.
It starts by logging in using your service principal.

```
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
```

Then it creates a resource group into which the VM will be deployed.

```
var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
```

### Deploy the template

Now, the sample loads the template and deploys it into the resource group that it just created.

```
try {
  var templateFilePath = path.join(__dirname, "templates/template.json");
  var template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));
  var publicSSHKey = fs.readFileSync(expandTilde(publicSSHKeyPath), 'utf8');
} catch (ex) {
  return callback(ex);
}
  
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
  
resourceClient.deployments.createOrUpdate(resourceGroupName, 
                                          deploymentName, 
                                          deploymentParameters, 
                                          callback);
```

## More information

Please refer to [Azure SDK for Node](https://github.com/Azure/azure-sdk-for-node) for more information.