var crypto = require('crypto');
var bitcore = require('bitcore');

// testnet
var privateKey = bitcore.PrivateKey({
  "bn":"8c026a359a13f707a3497ef58da45b628958ff98b5f33322cf29ede12fcfd56f",
  "compressed":true,
  "network":"testnet"
});
var address = privateKey.toAddress();
console.log("address",address);

getUTXO(address, function(utxo){
  console.log(utxo.toJSON());
  
  // test sending a small bit to a p2sh multisig
  var privateKey1 = new bitcore.PrivateKey('612b3ca3f368cf2658c2e1777d2fa28e6bcde8ea19312cbf69e09e7333e13994',bitcore.Networks.testnet);
  var privateKey2 = new bitcore.PrivateKey('d65788b9947b41625ffff946bc145187c6b85d1686e60becdf34567f17478730',bitcore.Networks.testnet);
  var publicKey1 = privateKey1.publicKey;
  var publicKey2 = privateKey2.publicKey;
  var P2SHScript = new bitcore.Script.buildMultisigOut([publicKey1, publicKey2], 1);
  var P2SHFund = P2SHScript.toScriptHashOut();
  
  var tx = new bitcore.Transaction()
    .from(utxo)
    .to(P2SHFund.toAddress(), 1000)
    .change(address)
    .sign(privateKey); 

  console.log("tx",tx);

  broadcast(tx, function(id){
    console.log("funded to",id);

    var tx2 = new bitcore.Transaction()
      .from({txId:id, outputIndex:0, inputIndex:0, satoshis:1000, script:P2SHFund.toString()}, [publicKey1, publicKey2], 1)
      .to(address, 1000)
      .sign(privateKey2); 

    console.log("tx2",tx2);
    broadcast(tx2, function(id2){
      console.log("funded back to",id2);
    });
    
  });
  
});

function broadcast(tx, done)
{
  var insight = new bitcore.transport.explorers.Insight(bitcore.Networks.testnet);
  insight.broadcast(tx, function(err, id) {
    if (err) {
      console.log("insight broadcast err",err);
      process.exit(1);
    }
    done(id);
  });
}

function getUTXO(address, done)
{
  var insight = new bitcore.transport.explorers.Insight(bitcore.Networks.testnet);
  insight.getUnspentUtxos(address, function(err, utxos) {
    if (err) {
      console.log("insight utxo err",err);
      process.exit(1);
    }
//    utxos.forEach(function(utxo){console.log(utxo.toJSON());});
    done(utxos[0]);
  });
}
