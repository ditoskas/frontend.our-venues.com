import { useState } from 'react'
import { Sparkles } from 'lucide-react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Sparkles className="h-10 w-10 text-purple-500" />
      <h1 className="text-3xl font-semibold">Get started</h1>
      <p className="text-gray-500 dark:text-gray-400">
        Edit <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm dark:bg-gray-800">src/App.tsx</code> and save to test HMR
      </p>
      <button
        type="button"
        className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700"
        onClick={() => setCount((count) => count + 1)}
      >
        Count is {count}
      </button>
    </div>
  )
}

export default App