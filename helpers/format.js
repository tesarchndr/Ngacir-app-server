function  formatRupiah(money) {
    return new Intl.NumberFormat('id-ID',
        { style: 'currency', currency: 'IDR' }
    ).format(money);
}

module.exports = {formatRupiah}