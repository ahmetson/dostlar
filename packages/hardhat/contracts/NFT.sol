// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721Enumerable, ERC721, IERC721} from '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title FriendNFT is the gift to your friends
 * @author Medet Ahmetson <milayter@gmail.com>
 * @notice Use the Chainlink random numbers to produce random numbers and then reward users with the random tokens
 */
contract FriendNFT is ERC721Enumerable, VRFConsumerBaseV2Plus {
  event RequestSent(uint256 requestId, uint32 numWords);
  event RequestFulfilled(uint256 requestId, uint256[] randomWords);

  struct RequestStatus {
    bool exists; // whether a requestId exists
    uint256 tokenId;
    address to;
  }

  mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
  mapping(uint256 => uint256) public burnRequests; /* tokenId --> requestId */

  // Your subscription ID.
  uint256 public s_subscriptionId;

  bytes32 public keyHash;

  uint32 public callbackGasLimit = 300000;
  uint16 public requestConfirmations = 3;
  uint32 public numWords = 1;

  uint256 private _tokenIdCounter;

  uint256 public defaultReward;
  uint256 public totalReward;

  address public medet;

  /// @notice One friend must have one NFT
  mapping(address => uint256) public friends;
  /// @notice Limit of the tokens per NFT ID;
  mapping(uint256 => uint256) public additional;
  mapping(uint256 => string) public tokenUris;

  modifier onlyTokenOwner(uint256 tokenId) {
    require(ownerOf(tokenId) == msg.sender, "not yours");
    _;
  }

  modifier notBurning(uint256 tokenId) {
    require(burnRequests[tokenId] == 0, "burning");
    _;
  }

  modifier onlyMedet() {
    require(msg.sender == medet, "you are not Medet");
    _;
  }

  /**
   * @param default_ Default amount of tokens to give as a limit
   * @param coordinator_ https://docs.chain.link/vrf/v2-5/supported-networks here is the VRF coordinator
   * @dev Mainnet coordinator_ is 0xD7f86b4b8Cae7D942340FF628F82735b7a20893a,
   * Testnet coordinator_ is 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B.
   */
  constructor(uint256 default_, address coordinator_) 
    ERC721("Medets Friend", "FRIEND") 
    VRFConsumerBaseV2Plus(coordinator_)
  {
    defaultReward = default_;
    medet = msg.sender;

    if (block.chainid == 1) {
      // 500 GWEI keyhash
      // https://docs.chain.link/vrf/v2-5/supported-networks#ethereum-mainnet
      keyHash = 0x3fd2fec10d06ee8f65e7f2e95f5c56511359ece3f33960ad8a866ae24a8ff10b;
    } else {
      // 100 GWEI keyhash
      // https://docs.chain.link/vrf/v2-5/supported-networks#sepolia-testnet
      keyHash = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    }
  }

  function setSubId(uint256 subId_) public onlyMedet {
    s_subscriptionId = subId_;
  }

  function setCallbackGasLimit(uint32 gasLimit_) public onlyMedet {
    callbackGasLimit = gasLimit_;
  }

  function changeMedetAddr(address to) public onlyMedet {
    medet = to;
  }

  /**
   * 
   * @param to Friends's wallet address
   */
  function presentGift(address to, string memory tokenUri) public onlyMedet {
    if (friends[to] == 0) {
      _tokenIdCounter += 1;
      uint256 tokenId = _tokenIdCounter;
      _safeMint(to, tokenId);
      friends[to] = tokenId;
      tokenUris[tokenId] = tokenUri;
    } else {
      require(burnRequests[friends[to]] == 0, "burning token");
      additional[friends[to]]++;
    }
    totalReward++;
  }

  function changeTokenUri(uint256 tokenId, string memory tokenUri) public onlyMedet {
    _requireMinted(tokenId);
    tokenUris[tokenId] = tokenUri;
  }

  function changeFriendAddr(address from, address to) public onlyMedet {
    require(friends[from] > 0, "not_found");
    require(friends[to] == 0, "taken address");

    friends[to] = friends[from];
    delete friends[from];
  }

  function changeDefaultReward(uint256 default_) public onlyMedet {
    defaultReward = default_;
  }

  function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) notBurning(tokenId) {
    super.transferFrom(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721, IERC721) notBurning(tokenId) {
    super.safeTransferFrom(from, to, tokenId, data);
  }

  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireMinted(tokenId);
    return tokenUris[tokenId];
  }

  function burn(uint256 tokenId, address to) public onlyTokenOwner(tokenId) returns (uint256 requestId) {
    require(burnRequests[tokenId] == 0, "already burning");
    require(s_subscriptionId > 0, "sub is not set");
    // Will revert if subscription is not set and funded.
    requestId = s_vrfCoordinator.requestRandomWords(
      VRFV2PlusClient.RandomWordsRequest({
        keyHash: keyHash,
        subId: s_subscriptionId,
        requestConfirmations: requestConfirmations,
        callbackGasLimit: callbackGasLimit,
        numWords: numWords,
        extraArgs: VRFV2PlusClient._argsToBytes(
          VRFV2PlusClient.ExtraArgsV1({
            nativePayment: true
          })
        )
      })
    );
    
    s_requests[requestId] = RequestStatus({
      exists: true,
      tokenId: tokenId,
      to: to
    });

    burnRequests[tokenId] = requestId;
      
    emit RequestSent(requestId, numWords);
    return requestId;
  }

  function fulfillRandomWords(
        uint256 _requestId,
        uint256[] calldata _randomWords
  ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        
        // Make sure the token is burnt and tokens are given to the user.
        uint256 tokenId = s_requests[_requestId].tokenId;
        address to = s_requests[_requestId].to;

        delete burnRequests[tokenId];
        delete s_requests[_requestId];

        uint256 rewardAmount = 1 + additional[tokenId];
        totalReward -= rewardAmount;

        // minimum
        uint256 limit = defaultReward * rewardAmount;
        uint256 minimum = limit / 2;
        uint256 amount = minimum + (_randomWords[0] % minimum);
        require(amount <= limit && amount >= minimum, "invalid amount");
        payable(to).transfer(amount);
        payable(medet).transfer(limit - amount);

        _burn(tokenId);
        delete additional[tokenId];
        delete friends[to];

        emit RequestFulfilled(_requestId, _randomWords);
  }

  function withdrawFunds() external onlyMedet {
    payable(msg.sender).transfer(address(this).balance);
  }

  receive() external payable {}
}
