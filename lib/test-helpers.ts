
type Callback = () => void;
export const seq = (...callbacks: Callback[]) => {
	let count = 0;
	return () => {
		if (callbacks.length > count) {
			callbacks[count]();
			count += 1;
		}
	}
}
