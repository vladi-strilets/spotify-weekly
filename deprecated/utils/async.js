exports.useAsync = (promise) => {
	return promise.then((data) => [data]).catch((err) => [null, err]);
};

exports.asyncForEach = async (array, callback) => {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
};
