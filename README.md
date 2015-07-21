# strategies

*strategies* is a coordination game server. As long as the server is hosted by a party trusted not to obstruct games, steal player information, or be hacked by someone who will, players can create and coordinate on programmable strategies. Strategies are written, then uploaded to the server by players, and players can choose to follow someone else's strategies, fork a strategy, or invite others to follow their strategy.

## Prospective uses:

- crowdfunding
- escrow
- money distribution
- smart contracts
- credit exchanges

## Example:

Suppose you and some friends wanted to make up a new currency. You could boot up this server, have each person share their Ripple wallet information with the server, and follow the strategy below. (Caution: dummy code. [See here](https://github.com/lukeburns/strategy) for a somewhat functional code.)

```javascript
var game = process.env.game; 

if (game.players.length >= 10) {

  var wallets = game.players.map(function (player) {
    return player.wallet;
  });
  
  var sharedWallet = createSharedWallet(wallets);
  
  players.forEach(function (player) {
    var wallet = player.wallet;
    sharedWallet.issue('1000 NEW', wallet);
  });
  
}
```
