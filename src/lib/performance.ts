/**
 * Performance monitoring utilities
 */

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string, callback: () => void) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    callback()
    const end = performance.now()
    console.log(`[Performance] ${componentName} rendered in ${(end - start).toFixed(2)}ms`)
  } else {
    callback()
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Measure async operation time
 */
export async function measureAsync<T>(
  operationName: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await asyncFn()
    const end = performance.now()
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${operationName} took ${(end - start).toFixed(2)}ms`)
    }
    return result
  } catch (error) {
    const end = performance.now()
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[Performance] ${operationName} failed after ${(end - start).toFixed(2)}ms`,
        error
      )
    }
    throw error
  }
}

/**
 * Batch updates to reduce re-renders
 */
export function batchUpdates<T>(
  updates: T[],
  applyUpdate: (update: T) => void,
  batchSize: number = 10
) {
  let currentBatch: T[] = []

  updates.forEach((update, index) => {
    currentBatch.push(update)

    if (currentBatch.length >= batchSize || index === updates.length - 1) {
      requestAnimationFrame(() => {
        currentBatch.forEach(applyUpdate)
        currentBatch = []
      })
    }
  })
}

/**
 * Lazy load images for better performance
 */
export function lazyLoadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Check if element is in viewport (for virtual scrolling)
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * Get viewport height with buffer for virtual scrolling
 */
export function getViewportHeight(buffer: number = 200): number {
  return (window.innerHeight || document.documentElement.clientHeight) + buffer * 2
}

/**
 * Memory usage monitoring (Chrome only)
 */
export function logMemoryUsage() {
  if (
    process.env.NODE_ENV === 'development' &&
    'memory' in performance &&
    (performance as any).memory
  ) {
    const memory = (performance as any).memory
    console.log('[Memory]', {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    })
  }
}
