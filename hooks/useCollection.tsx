import MoralisType from "moralis-v1";
import { MarketTablePosition, MarketTableRow } from "../types/markets";
import { useQueries, useQuery } from "react-query";
import { queryKeys } from "../helpers/queryHelper";
import { defaultCacheStaleTime } from "../constants/constant";
import { getUserCoupons } from "./useHerc20";
import { getImageUrlFromMetaData } from "../helpers/NFThelper";
import { getMetaDataFromNFTId } from "./useNFT";

const defaultPosition: MarketTablePosition = {
  name: "",
  image: "",
  tokenId: "",
}

export function useMarket(user: MoralisType.User | null, collections: collection[]): MarketTableRow[] {
  const result = collections.map(collection => {
      const market: MarketTableRow = {
        key: collection.HERC20ContractAddress,
        name: `${collection.name}/${collection.erc20Name}`,
        icon: collection.icon,
        erc20Icon: collection.erc20Icon,
        rate: 0.1,
        debt: 0,
        allowance: 0,
        available: 0,
        value: 0,
        positions: [
          {
            name: "cat",
            tokenId: "1",
            image: "/nfts/bayc.jpg"
          },
          {
            name: "dog",
            tokenId: "2",
            image: "/nfts/bayc.jpg"
          }
        ],
      }
      return market
    }
  )
  return result
}

export function usePositions(HERC20ContractAddress: string, ERC721ContractAddress: string, user: MoralisType.User | null, unit: Unit): [MarketTablePosition[], boolean] {
  const onGetCouponsSuccess = (data: coupon[]) => {
    return data
  }
  const onGetCouponsError = () => {
    return [] as coupon[]
  }
  const walletPublicKey: string = user?.get("ethAddress") || ""
  const {data: couponList, isLoading: isLoadingCoupons, isFetching: isFetchCoupons} = useQuery(
    queryKeys.listUserCoupons(HERC20ContractAddress, walletPublicKey),
    () => {
      if (walletPublicKey != "") {
        return getUserCoupons({HERC20ContractAddress, userAddress: walletPublicKey, unit})
      } else {
        return [] as Array<coupon>
      }
    },
    {
      onSuccess: onGetCouponsSuccess,
      onError: onGetCouponsError,
      retry: false,
      staleTime: defaultCacheStaleTime
    }
  )

  const coupons = couponList || []

  const results = useQueries(
    coupons.map(coupon => {
      return {
        queryKey: queryKeys.NFTDetail(ERC721ContractAddress, coupon.NFTId),
        queryFn: async () => {
          try {
            const metaData = await getMetaDataFromNFTId(ERC721ContractAddress, coupon.NFTId)
            const result: MarketTablePosition = {
              // id: `${metaData.name}-${metaData.token_id}`, //id will be name-tokenId
              name: metaData.name,
              image: getImageUrlFromMetaData(metaData.metadata || ""),
              tokenId: metaData.token_id,
            }
            return result
          } catch (e) {
            console.error("Error fetching market position with error")
            console.error(e)
            return defaultPosition
          }
        },
        staleTime: defaultCacheStaleTime,
        retry: false,
        enabled: coupons.length > 0
      }
    })
  )
  const isLoadingPosition = results.some(query => query.isLoading)
  const isFetchingPosition = results.some(query => query.isFetching)
  const positions = results.map(result => result.data || defaultPosition)

  return [positions, isLoadingPosition || isFetchingPosition || isLoadingCoupons || isFetchCoupons]

}