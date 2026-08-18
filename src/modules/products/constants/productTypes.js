import { translateText } from "../../../localization/i18n";export const PRODUCT_TYPES = [
{
  value: "RAW_MATERIAL",
  label: translateText("Xomashyo")
},
{
  value: "SEMI_FINISHED",
  label: translateText("Yarim tayyor mahsulot")
},
{
  value: "FINISHED_GOOD",
  label: translateText("Tayyor mahsulot")
},
{
  value: "TRADING_PRODUCT",
  label: translateText("Savdo mahsuloti")
},
{
  value: "SERVICE",
  label: translateText("Xizmat")
}];


export const PRODUCT_STATUS = [
{
  value: "ACTIVE",
  label: translateText("Faol")
},
{
  value: "INACTIVE",
  label: translateText("Faol emas")
},
{
  value: "ARCHIVED",
  label: translateText("Arxiv")
}];


export const STOCK_STATUS = [
{
  value: "IN_STOCK",
  label: translateText("Yetarli")
},
{
  value: "LOW_STOCK",
  label: translateText("Kam qolgan")
},
{
  value: "OUT_OF_STOCK",
  label: translateText("Tugagan")
}];