import admin from "../styles/admin.module.css";

export function SearchBar({
  value,
  searchBy = "product",
  showSearchBy = true,
  placeholder = "Search…",
  name = "q",
  searchByName = "searchBy",
}) {
  return (
    <div className={admin.toolbar}>
      <s-stack direction="inline" gap="base" alignItems="end">
        {showSearchBy ? (
          <s-select label="Search by" name={searchByName} value={searchBy}>
            <s-option value="product">Product</s-option>
            <s-option value="vendor">Vendor</s-option>
            <s-option value="customer">Customer</s-option>
          </s-select>
        ) : null}
        <s-text-field
          label="Search"
          name={name}
          value={value}
          placeholder={placeholder}
          autocomplete="off"
        />
        <s-button type="submit" variant="primary">
          Search
        </s-button>
      </s-stack>
    </div>
  );
}
