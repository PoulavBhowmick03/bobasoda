'use client'

import { AuthButton } from '@coinbase/cdp-react'
import { useIsInitialized } from '@coinbase/cdp-hooks'

export default function CDPAuthButton() {
  const { isInitialized } = useIsInitialized()

  if (!isInitialized) {
    return (
      <div className="text-center p-4">
        <p className="text-sm opacity-75">Initializing wallet...</p>
      </div>
    )
  }

  return (
    <div className="bg-yellow-400 rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-black font-bold text-2xl mb-2">
          Sign in to Bobasoda
        </h3>
        <p className="text-black opacity-75 text-sm">
          Create an embedded wallet instantly with email, SMS, or social login.
        </p>
      </div>

      <AuthButton className="w-full justify-center" />
    </div>
  )
}
