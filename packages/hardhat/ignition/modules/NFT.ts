import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const NFTModule = buildModule('NFTModule', (m) => {
  const defaultReward = '14000000000000000' // 0.014 ETH or 50$
  // const coordinator_ = '0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B' // Testnet Sepolia
  // const subId = '76899089439967341036735122092992375517992210821098430441798408281239919775401' // Testnet Sepolia

  const coordinator_ = '0xD7f86b4b8Cae7D942340FF628F82735b7a20893a' // Mainnet Ethereum
  const subId = '33290054916380699973905686274084399065477670078062051426065293291632244302904'

  const nft = m.contract('FriendNFT', [defaultReward, coordinator_])

  m.call(nft, 'setSubId', [subId])

  return { nft }
})

export default NFTModule
