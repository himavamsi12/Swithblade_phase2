import { PriceCell as PriceCell_e27bf7b8cc50640dcdd584767b8eac3c } from '@payloadcms/plugin-ecommerce/client'
import { PriceInput as PriceInput_b91672ccd6e8b071c11142ab941fedfb } from '@payloadcms/plugin-ecommerce/rsc'
import { ProductCell as ProductCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { VariantManager as VariantManager_9afb36b7f51fabf03bd570866040f16f } from '../../../payload/admin/variant-manager'
import { StockCell as StockCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { PriceCell as PriceCell_58ee845eee47359816a345d4cbde8c7c } from '../../../payload/admin/product-cells'
import { YesNoField as YesNoField_2e17029b3b430132c276b417ecaf177d } from '../../../payload/admin/yes-no-field'
import { BackLink as BackLink_ae0cb64448013429545bcc312d3afd16 } from '../../../payload/admin/back-link'
import { VariantOptionsField as VariantOptionsField_08c3dbefad59c08745c075c2f15a6b25 } from '../../../payload/admin/variant-options-field'
import { TOTPField as TOTPField_4eaf6cb33cfb75be01716613e3c9a512 } from 'payload-totp/rsc'
import { Icon as Icon_7c32d6b01f1e3bfd0e7105220c111148 } from '../../../payload/admin/brand'
import { Logo as Logo_7c32d6b01f1e3bfd0e7105220c111148 } from '../../../payload/admin/brand'
import { StoreSwitcher as StoreSwitcher_6865bef062c79e7e52ae81683d11bb53 } from '../../../payload/admin/store-switcher'
import { TOTPProvider as TOTPProvider_4eaf6cb33cfb75be01716613e3c9a512 } from 'payload-totp/rsc'
import { TOTPSetup as TOTPSetup_4eaf6cb33cfb75be01716613e3c9a512 } from 'payload-totp/rsc'
import { TOTPVerify as TOTPVerify_4eaf6cb33cfb75be01716613e3c9a512 } from 'payload-totp/rsc'
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
  "/payload/admin/yes-no-field#YesNoField": YesNoField_2e17029b3b430132c276b417ecaf177d,
  "/payload/admin/back-link#BackLink": BackLink_ae0cb64448013429545bcc312d3afd16,
  "/payload/admin/variant-options-field#VariantOptionsField": VariantOptionsField_08c3dbefad59c08745c075c2f15a6b25,
  "payload-totp/rsc#TOTPField": TOTPField_4eaf6cb33cfb75be01716613e3c9a512,
  "/payload/admin/brand#Icon": Icon_7c32d6b01f1e3bfd0e7105220c111148,
  "/payload/admin/brand#Logo": Logo_7c32d6b01f1e3bfd0e7105220c111148,
  "/payload/admin/store-switcher#StoreSwitcher": StoreSwitcher_6865bef062c79e7e52ae81683d11bb53,
  "payload-totp/rsc#TOTPProvider": TOTPProvider_4eaf6cb33cfb75be01716613e3c9a512,
  "payload-totp/rsc#TOTPSetup": TOTPSetup_4eaf6cb33cfb75be01716613e3c9a512,
  "payload-totp/rsc#TOTPVerify": TOTPVerify_4eaf6cb33cfb75be01716613e3c9a512,
  "/payload/admin/dashboard#Dashboard": Dashboard_7ee4dd2ec11170c51e734ab731bed955,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-s3/client#S3ClientUploadHandler": S3ClientUploadHandler_f97aa6c64367fa259c5bc0567239ef24
}
