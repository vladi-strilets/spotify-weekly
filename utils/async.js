const useAsync = (promise) => {
	return promise.then((data) => [data]).catch((err) => [null, err]);
};

module.exports = useAsync;
