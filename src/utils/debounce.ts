export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function immediateThenDebounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let isFirstCall = true; // Track whether it's the first call

  return function(...args: Parameters<T>) {
    if (isFirstCall) {
      // Execute the function immediately for the first call
      fn(...args);
      isFirstCall = false; // Mark the first call as done
    } else {
      // Clear the existing timeout
      clearTimeout(timeout);

      // Set a new timeout and execute the function after the debounce period
      timeout = setTimeout(() => {
        fn(...args);
        isFirstCall = true; // Reset for the next set of calls
      }, ms);
    }
  };
}

