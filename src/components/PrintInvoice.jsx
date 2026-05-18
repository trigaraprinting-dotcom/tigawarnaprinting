import React from 'react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const Row = ({ label, val }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '56px 6px 1fr', lineHeight: '1.25' }}>
    <span>{label}</span><span>:</span><span style={{ wordBreak: 'break-word' }}>{val}</span>
  </div>
);

const PayRow = ({ label, val, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? '700' : 'normal' }}>
    <span>{label}</span><span>{val}</span>
  </div>
);

export const PrintInvoice = ({ orderToPrint, displayName }) => {
  if (!orderToPrint) return null;

  const d = orderToPrint.created_at?.toDate
    ? orderToPrint.created_at.toDate()
    : new Date(orderToPrint.created_at);

  const tanggal = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const jam     = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isDone   = orderToPrint.status === 'done';
  const hasDP    = Number(orderToPrint.dp_amount || 0) > 0;
  const total    = Number(orderToPrint.total_price || 0);
  const dp       = Number(orderToPrint.dp_amount || 0);
  const sisa     = total - dp;

  const printTotal   = total - Number(orderToPrint.design_price || 0);
  const unitPrice    = Math.round(printTotal / Math.max(1, orderToPrint.quantity));

  const S = {
    wrap:    { fontSize: '7.5pt', fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.25', color: '#000' },
    center:  { textAlign: 'center' },
    dash:    { borderBottom: '1px dashed #000', margin: '4px 0' },
    section: { marginBottom: '3px' },
    tiny:    { fontSize: '7pt' },
  };

  return (
    <div className="screen-hidden-print-only">
      <div className="thermal-receipt" style={S.wrap}>

        {/* HEADER */}
        <div style={{ ...S.center, marginBottom: '4px' }}>
          <div style={{ fontWeight: '900', fontSize: '11pt', letterSpacing: '1px' }}>TIGA WARNA ADV</div>
          <div style={{ ...S.tiny, lineHeight: '1.3', marginTop: '1px' }}>
            Jl. Sultan Agung No. 52, Cokoleo,<br />Kepanjen, Kab. Malang Jawa Timur
          </div>
        </div>

        <div style={S.dash} />

        {/* METADATA */}
        <div style={S.section}>
          <Row label="Tanggal" val={tanggal} />
          <Row label="Jam"     val={jam} />
          <Row label="Customer" val={(orderToPrint.customer_name || '').toUpperCase()} />
          <Row label="Telp"   val={orderToPrint.customer_phone || '-'} />
          <Row label="Invoice" val={('INV' + (orderToPrint.id?.slice(-6) || '')).toUpperCase()} />
          <Row label="Kasir"  val={(displayName || 'Kasir/CS').toUpperCase()} />
        </div>

        <div style={S.dash} />

        {/* ITEMS */}
        <div style={S.section}>
          <div style={{ textTransform: 'uppercase', fontWeight: '700' }}>
            1. {orderToPrint.product_name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
            <span>{formatRupiah(unitPrice)} x{orderToPrint.quantity}</span>
            <span>{formatRupiah(printTotal)}</span>
          </div>

          {orderToPrint.needs_design && orderToPrint.design_price > 0 && (
            <>
              <div style={{ fontWeight: '700' }}>2. JASA DESAIN</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                <span>{formatRupiah(orderToPrint.design_price)} x1</span>
                <span>{formatRupiah(orderToPrint.design_price)}</span>
              </div>
            </>
          )}

          {orderToPrint.ongkos_potong > 0 && (
            <>
              <div style={{ fontWeight: '700' }}>
                {orderToPrint.needs_design && orderToPrint.design_price > 0 ? '3' : '2'}. JASA CUTTING
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                <span>{formatRupiah(orderToPrint.ongkos_potong)} x1</span>
                <span>{formatRupiah(orderToPrint.ongkos_potong)}</span>
              </div>
            </>
          )}
        </div>

        <div style={S.dash} />

        {/* PAYMENT */}
        <div style={S.section}>
          <PayRow label="Subtotal" val={formatRupiah(total)} />
          <PayRow label="Total"    val={formatRupiah(total)} bold />

          {isDone ? (
            hasDP ? (
              <>
                <PayRow label="DP"              val={formatRupiah(dp)} />
                <PayRow label="Pelunasan"       val={formatRupiah(sisa)} />
                <PayRow label="Terima"          val={formatRupiah(orderToPrint.final_amount_received || 0)} />
                <PayRow label="Kembali"         val={formatRupiah(Math.max(0, orderToPrint.final_change_amount || 0))} />
                <PayRow label="Tipe Bayar"      val={(orderToPrint.final_payment_type || 'TRF').toUpperCase()} />
              </>
            ) : (
              <>
                <PayRow label="Terima"     val={formatRupiah(orderToPrint.final_amount_received || 0)} />
                <PayRow label="Kembali"    val={formatRupiah(Math.max(0, orderToPrint.final_change_amount || 0))} />
                <PayRow label="Tipe Bayar" val={(orderToPrint.final_payment_type || 'TRF').toUpperCase()} />
              </>
            )
          ) : (
            <>
              <PayRow label="DP"          val={formatRupiah(dp)} />
              <PayRow label="Terima"      val={formatRupiah(orderToPrint.dp_amount_received || 0)} />
              <PayRow label="Kembali"     val={formatRupiah(Math.max(0, orderToPrint.dp_change_amount || 0))} />
              <PayRow label="Sisa Tagihan" val={formatRupiah(sisa)} />
              <PayRow label="Tipe Bayar"  val={(orderToPrint.dp_payment_type || '-').toUpperCase()} />
              <PayRow label="Status"      val="BELUM LUNAS" bold />
            </>
          )}
        </div>

        <div style={S.dash} />

        {/* FOOTER */}
        <div style={{ ...S.center, ...S.tiny }}>
          <div>Telp. 082132418501 | Wa. 082132418501</div>
          <div style={{ fontWeight: '700', margin: '2px 0' }}>- TERIMA KASIH -</div>
        </div>

        {/* STRUK UANG MUKA warning */}
        {!isDone && (
          <div style={{
            border: '1px solid #000',
            padding: '3px 6px',
            margin: '4px 0',
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: '900', fontSize: '7.5pt' }}>⚠ STRUK UANG MUKA</div>
            <div style={{ ...S.tiny }}>
              Belum lunas. Sisa: {formatRupiah(sisa)}
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <div style={{ ...S.center, ...S.tiny, lineHeight: '1.3', marginTop: '3px' }}>
          periksa kembali pesanan anda. kesalahan pemesanan
          karena kelalaian customer tidak dapat dikembalikan.
          invoice hilang dikenakan biaya cetak ulang struk
          Rp. 2.000 saat pengambilan.
        </div>

      </div>
    </div>
  );
};
