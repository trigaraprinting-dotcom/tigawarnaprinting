import React from 'react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

export const PrintInvoice = ({ orderToPrint, displayName }) => {
  if (!orderToPrint) return null;

  return (
    <div className="screen-hidden-print-only">
      <div style={{fontFamily:'"Courier New",Courier,monospace',fontSize:'10pt',color:'#000',background:'#fff',width:'72mm',margin:'0 auto',padding:'3mm 2mm',lineHeight:'1.4'}}>

        {/* HEADER */}
        <div style={{textAlign:'center',marginBottom:'8px'}}>
          <div style={{fontWeight:'900',fontSize:'13pt',letterSpacing:'2px'}}>TIGA WARNA ADV</div>
          <div style={{fontSize:'8pt',lineHeight:'1.3',marginTop:'2px'}}>
            Jl. Sultan Agung No. 52, Cokoleo,<br/>Kepanjen, Kab. Malang Jawa Timur
          </div>
        </div>

        <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

        {/* METADATA */}
        <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
          {[
            ['Tanggal', (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); })()],
            ['Jam',     (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); })()],
            ['Customer',(orderToPrint.customer_name||'').toUpperCase()],
            ['Telp',    orderToPrint.customer_phone||'-'],
            ['Invoice', (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return ('INV'+d.toLocaleDateString('id-ID',{year:'2-digit',month:'2-digit',day:'2-digit'}).replace(/\//g,'')+(orderToPrint.id?.slice(0,6)||'')).toUpperCase(); })()],
            ['Kasir',   (displayName||'Kasir/CS').toUpperCase()],
          ].map(([label,val])=>(
            <div key={label} style={{display:'grid',gridTemplateColumns:'65px 1fr',marginBottom:'1px'}}>
              <span>{label}</span><span>: {val}</span>
            </div>
          ))}
        </div>

        <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

        {/* ITEMS */}
        <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
          <div style={{marginBottom:'4px'}}>
            <div style={{textTransform:'uppercase'}}>1. {orderToPrint.product_name}</div>
            <div style={{display:'flex',justifyContent:'space-between',paddingLeft:'12px',marginTop:'1px'}}>
              <span>{formatRupiah(Math.round((orderToPrint.total_price-(orderToPrint.design_price||0))/Math.max(1,orderToPrint.quantity)))} x{orderToPrint.quantity}</span>
              <span>{formatRupiah(orderToPrint.total_price-(orderToPrint.design_price||0))}</span>
            </div>
          </div>
          {orderToPrint.needs_design && orderToPrint.design_price > 0 && (
            <div style={{marginBottom:'4px'}}>
              <div>2. JASA DESAIN</div>
              <div style={{display:'flex',justifyContent:'space-between',paddingLeft:'12px',marginTop:'1px'}}>
                <span>{formatRupiah(orderToPrint.design_price)} x1</span>
                <span>{formatRupiah(orderToPrint.design_price)}</span>
              </div>
            </div>
          )}
          {orderToPrint.ongkos_potong > 0 && (
            <div style={{marginBottom:'4px'}}>
              <div>{orderToPrint.needs_design && orderToPrint.design_price > 0 ? '3' : '2'}. JASA CUTTING</div>
              <div style={{display:'flex',justifyContent:'space-between',paddingLeft:'12px',marginTop:'1px'}}>
                <span>{formatRupiah(orderToPrint.ongkos_potong)} x1</span>
                <span>{formatRupiah(orderToPrint.ongkos_potong)}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

        {/* PAYMENT */}
        <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><span>: {formatRupiah(orderToPrint.total_price)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:'700'}}><span>Total</span><span>: {formatRupiah(orderToPrint.total_price)}</span></div>
          {orderToPrint.status === 'done' ? (
            orderToPrint.dp_amount > 0 ? (
              <>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>DP Masuk Awal</span><span>: {formatRupiah(orderToPrint.dp_amount||0)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Sisa Pelunasan</span><span>: {formatRupiah(orderToPrint.total_price-(orderToPrint.dp_amount||0))}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima (Lunas)</span><span>: {formatRupiah(orderToPrint.final_amount_received||0)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.final_change_amount||0))}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.final_payment_type||'TRF').toUpperCase()}</span></div>
              </>
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima (Lunas)</span><span>: {formatRupiah(orderToPrint.final_amount_received||0)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.final_change_amount||0))}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.final_payment_type||'TRF').toUpperCase()}</span></div>
              </>
            )
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>DP Masuk</span><span>: {formatRupiah(orderToPrint.dp_amount||0)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima</span><span>: {formatRupiah(orderToPrint.dp_amount_received||0)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.dp_change_amount||0))}</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Sisa Tagihan</span><span>: {formatRupiah(orderToPrint.total_price-(orderToPrint.dp_amount||0))}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.dp_payment_type||'-').toUpperCase()}</span></div>
            </>
          )}
        </div>

        <div style={{borderBottom:'1px dashed #000',marginBottom:'8px'}}/>

        {/* FOOTER */}
        <div style={{textAlign:'center',fontSize:'8pt',position:'relative'}}>
          <div style={{fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>Terima Kasih</div>
          {orderToPrint.status !== 'done' && (
            <div style={{
              border:'2px solid #f59e0b',
              borderRadius:'4px',
              padding:'4px 8px',
              marginBottom:'8px',
              color:'#b45309',
              fontWeight:'900',
              fontSize:'9pt',
              letterSpacing:'1px',
              textTransform:'uppercase',
              background:'#fffbeb',
            }}>
              ⚠ STRUK UANG MUKA<br/>
              <span style={{fontWeight:'400',fontSize:'7.5pt',textTransform:'none'}}>Pesanan belum lunas. Sisa tagihan: {formatRupiah(Number(orderToPrint.total_price) - Number(orderToPrint.dp_amount||0))}</span>
            </div>
          )}
          <div style={{lineHeight:'1.5',marginBottom:'12px'}}>
            periksa kembali pesanan anda.<br/>
            kesalahan print karena kelalaian customer<br/>
            tidak dapat dikembalikan.<br/>
            invoice hilang dikenakan biaya cetak<br/>
            ulang struk Rp. 2.000 saat pengambilan.
          </div>

          <div style={{fontSize:'6pt',color:'#666',marginTop:'8px',borderTop:'1px solid #ddd',paddingTop:'4px'}}>
            © {new Date().getFullYear()} Tiga Warna Print Management<br/>
            Software Version v1.0.0
          </div>
        </div>

      </div>
    </div>
  );
};
