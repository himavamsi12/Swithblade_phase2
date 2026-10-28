import { PriceCell as PriceCell_e27bf7b8cc50640dcdd584767b8eac3c } from '@payloadcms/plugin-ecommerce/client'
import { PriceInput as PriceInput_b91672ccd6e8b071c11142ab941fedfb } from '@payloadcms/plugin-ecommerce/rsc'
import { ProductCell as ProductCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { VariantManager as VariantManager_9afb36b7f51fabf03bd570866040f16f } from '../../../payload/admin/variant-manager'
import { StockCell as StockCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { PriceCell as PriceCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { BackLink as BackLink_ae0cb64448013429545bcc312d3afd16 } from '../../../payload/admin/back-link'
import { VariantOptionsSelector as VariantOptionsSelector_b91672ccd6e8b071c11142ab941fedfb } from '@payloadcms/plugin-ecommerce/rsc'
import { Icon as Icon_7c32d6b01f1e3bfd0e7105220c111148 } from '../../../payload/admin/brand'
import { Logo as Logo_7c32d6b01f1e3bfd0e7105220c111148 } from '../../../payload/admin/brand'
import { StoreSwitcher as StoreSwitcher_6865bef062c79e7e52ae81683d11bb53 } from '../../../payload/admin/store-switcher'
import { Dashboard as Dashboard_7ee4dd2ec11170c51e734ab731bed955 } from '../../../payload/admin/dashboard'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { S3ClientUploadHandler as S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24 } from '@payloadcms/storage-s3/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "@payloadcms/plugin-ecommerce/client#PriceCell": PriceCell_e27bf7b8cc50640dcdd584767b8eac3c,
  "@payloadcms/plugin-ecommerce/rsc#PriceInput": PriceInput_b91672ccd6e8b071c11142ab941fedfb,
  "/payload/admin/product-cells#ProductCell": ProductCell_58ee845eee47359816a345d4cbde8c7c,
  "/payload/admin/variant-manager#VariantManager": VariantManager_9afb36b7f51fabf03bd570866040f16f,
  "/payload/admin/product-cells#StockCell": StockCell_58ee845eee47359816a345d4cbde8c7c,
  "/payload/admin/product-cells#PriceCell": PriceCell_58ee845eee47359816a345d4cbde8c7c,
  "/payload/admin/back-link#BackLink": BackLink_ae0cb64448013429545bcc312d3afd16,
  "@payloadcms/plugin-ecommerce/rsc#VariantOptionsSelector": VariantOptionsSelector_b91672ccd6e8b071c11142ab941fedfb,
  "/payload/admin/brand#Icon": Icon_7c32d6b01f1e3bfd0e7105220c111148,
  "/payload/admin/brand#Logo": Logo_7c32d6b01f1e3bfd0e7105220c111148,
  "/payload/admin/store-switcher#StoreSwitcher": StoreSwitcher_6865bef062c79e7e52ae81683d11bb53,
  "/payload/admin/dashboard#Dashboard": Dashboard_7ee4dd2ec11170c51e734ab731bed955,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
