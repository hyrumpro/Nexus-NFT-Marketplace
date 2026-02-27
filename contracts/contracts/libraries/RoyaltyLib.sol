// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RoyaltyLib
 * @dev Library for royalty calculations
 */
library RoyaltyLib {
    uint256 public constant ROYALTY_DENOMINATOR = 10000;
    uint256 public constant MAX_ROYALTY_PERCENT = 1000; // 10%

    struct RoyaltyInfo {
        address recipient;
        uint96 percentage;
    }

    function calculateRoyalty(
        uint256 salePrice,
        address recipient,
        uint96 percentage
    ) internal pure returns (uint256) {
        if (recipient == address(0) || percentage == 0 || salePrice == 0) {
            return 0;
        }
        return (salePrice * percentage) / ROYALTY_DENOMINATOR;
    }

    function validateRoyalty(uint96 percentage) internal pure returns (bool) {
        return percentage <= MAX_ROYALTY_PERCENT;
    }

    function splitRoyalty(
        uint256 salePrice,
        RoyaltyInfo[] calldata royalties
    ) internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](royalties.length);
        uint256 totalRoyalty;
        
        for (uint256 i = 0; i < royalties.length; i++) {
            uint256 royaltyAmount = calculateRoyalty(
                salePrice,
                royalties[i].recipient,
                royalties[i].percentage
            );
            amounts[i] = royaltyAmount;
            totalRoyalty += royaltyAmount;
        }

        require(totalRoyalty <= salePrice, "Royalties exceed sale price");
        return amounts;
    }
}
