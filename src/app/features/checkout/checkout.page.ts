import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { forkJoin, of, catchError } from "rxjs";
import { PaymentsApi } from "../payments/payments.api";
import { CatalogApi } from "../catalog/catalog.api";
import { Icon } from "../../shared/components/icon";
import { ProductImage } from "../../shared/components/product-image";
import { AuthService } from "../../core/auth/auth.service";
import { AddressesApi } from "../addresses/addresses.api";
import { CartApi } from "../cart/cart.api";
import { OrdersApi } from "../orders/orders.api";
import { Address, Cart } from "../../core/api/models";
import { CheckoutAttempt } from "./checkout-attempt";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, CurrencyPipe, FormsModule, RouterLink, Status, Icon, ProductImage],
  styleUrl: "./checkout.scss",
  templateUrl: "./checkout.html",
})
export class CheckoutPage extends PageState {
  auth = inject(AuthService);
  addressApi = inject(AddressesApi);
  cartApi = inject(CartApi);
  orders = inject(OrdersApi);
  attempt = inject(CheckoutAttempt);
  router = inject(Router);
  addresses = signal<Address[]>([]);
  cart = signal<Cart | null>(null);
  locked = signal(false);
  ready = signal(false);
  needsRefresh = signal(false);
  private destroy = inject(DestroyRef);
  payments = inject(PaymentsApi);
  catalog = inject(CatalogApi);
  methods: string[] = [];
  labels = signal<Record<number, {name: string; image: string; variant: string}>>({});
  editingAddress = signal<number | null>(null);
  addressForm = signal(false);
  deleteId = signal<number | null>(null);
  addressDraft: Omit<Address, "id"> = this.emptyAddress();
  emptyAddress(): Omit<Address,"id"> { return {address_line1:"",city:"",country:"",zip_code:"",is_default:false}; }
  openAddress(address?: Address) {
    if(this.locked()||this.busy()) return;
    this.editingAddress.set(address?.id ?? null);
    this.addressDraft=address ? {...address} : this.emptyAddress();this.addressForm.set(true);
  }
  saveAddress() {
    if(this.locked()||this.busy())return;
    const {id: ignored, ...body} = this.addressDraft as Address;
    const clean={...body,address_line1:body.address_line1.trim(),city:body.city.trim(),country:body.country.trim(),zip_code:body.zip_code.trim()};
    if(!clean.address_line1||!clean.city||!clean.country||!clean.zip_code){this.error.set("Complete the delivery address fields.");return;}
    const id=this.editingAddress();
    this.run(id ? this.addressApi.update(id,clean) : this.addressApi.create({...clean,is_default:this.addresses().length===0}),address=>{
      if(!Number.isSafeInteger(address.id)||address.id<1){this.error.set("Address was not confirmed. Reload before retrying.");return;}
      this.addresses.update(rows=>id ? rows.map(row=>row.id===id?address:row) : [...rows,address]);
      this.addressId=address.id;this.addressForm.set(false);
    });
  }
  removeAddress(id:number) {
    if(this.locked()||this.busy()||this.deleteId()!==id)return;
    this.run(this.addressApi.remove(id),()=>{
      this.addresses.update(rows=>rows.filter(row=>row.id!==id));this.deleteId.set(null);
      if(this.addressId===id)this.addressId=this.addresses().find(a=>a.is_default)?.id||this.addresses()[0]?.id||0;
    });
  }
  paymentName(method:string){return ({BAKONG:"Bakong KHQR",KHQR:"KHQR",ABA:"ABA / KHQR",CASH_ON_DELIVERY:"Cash on Delivery (COD)"} as Record<string,string>)[method]||method;}
  paymentHint(method:string){return method==="CASH_ON_DELIVERY"?"Pay when you receive your order":"Scan the order QR with your banking app";}
  canSubmit(){return this.ready()&&!this.needsRefresh()&&!this.addressForm()&&!this.busy()&&!!this.addressId&&(this.locked()||!!this.cart()?.items.length&&this.methods.includes(this.method)&&!!this.selectedAddress());}
  addressId = 0;
  method = "CASH_ON_DELIVERY";
  currency = "USD";
  constructor() {
    super();
    this.load();
  }
  load() {
    if(this.busy())return;
    const previous = this.attempt.read(this.auth.userId());
    if (previous) {
      this.locked.set(true);
      this.addressId = previous.address_id;
      this.method = previous.payment_method;
      this.currency = previous.currency;
    }
    this.run(
      forkJoin({
        addresses: this.addressApi.list(),
        methods: this.payments.methods(),
        // A pending checkout locks cart writes, including get-or-create.
        cart: previous ? this.cartApi.current() : this.cartApi.load(),
      }),
      (r) => {
        this.ready.set(true);this.needsRefresh.set(false);
        this.addresses.set(r.addresses);
        this.cart.set(r.cart);
        this.methods=r.methods.filter(method=>["BAKONG","KHQR","ABA","CASH_ON_DELIVERY"].includes(method));
        if(!previous&&!this.methods.includes(this.method))this.method=this.methods[0]||"";
        const ids=[...new Set(r.cart.items.map(item=>item.product_sku_id))];
        if(ids.length)forkJoin(ids.map(id=>this.catalog.forSku(id).pipe(catchError(()=>of(null))))).pipe(takeUntilDestroyed(this.destroy)).subscribe(products=>{
          const labels:Record<number,{name:string;image:string;variant:string}>={};
          products.forEach((product,index)=>{if(!product)return;const id=ids[index];const sku=product.skus.find(s=>s.id===id);
            labels[id]={name:product.name,image:sku?.image_url||product.main_image?.[0]||"/images/product-placeholder.svg",variant:sku?.attributes?.flatMap(a=>a.attributes.map(v=>v.value)).join(" · ")||sku?.description||sku?.sku||""};});
          this.labels.set(labels);
        });
        if (!previous)
          this.addressId =
            r.addresses.find((a) => a.is_default)?.id ||
            r.addresses[0]?.id ||
            0;
      },
    );
  }
  selectedAddress() {
    return this.addresses().find((a) => a.id === this.addressId);
  }
  submit() {
    if (!this.canSubmit()) return;
    const body = this.attempt.begin(
      this.auth.userId(),
      this.addressId,
      this.method,
      this.currency,
      {expected_total:this.cart()?.total_price,reviewed_items:this.cart()?.items.map(item=>({skuId:item.product_sku_id,quantity:item.quantity}))},
    );
    this.locked.set(true);
    this.run(this.orders.checkout(body), (o) => {
      if (o.status === "CHECKOUT_PENDING") {
        this.message.set(
          "Stock confirmation is still pending. Retry this checkout shortly.",
        );
        return;
      }
      if(o.status==="FAILED"||o.status==="CANCELLED"){
        this.attempt.clear(this.auth.userId());this.locked.set(false);this.needsRefresh.set(true);
        this.error.set("Checkout could not be completed. Refresh your cart and review the latest prices before retrying.");return;
      }
      this.attempt.clear(this.auth.userId());
      this.locked.set(false);
      void this.router.navigate(["/orders", o.id]);
    });
  }
}
