import React from "react";
import type from "prop-types";
import { StyleSheet, css } from "aphrodite";
import { orderBy, flatten, sampleSize } from "lodash";
import GSForm from "../components/forms/GSForm";
import yup from "yup";
import Form from "react-formal";
import CampaignFormSectionHeading from "../components/CampaignFormSectionHeading";
import { ListItem, List } from "material-ui/List";
import AutoComplete from "material-ui/AutoComplete";
import RaisedButton from "material-ui/RaisedButton";
import Checkbox from "material-ui/Checkbox";
import IconButton from "material-ui/IconButton/IconButton";
import AddIcon from "material-ui/svg-icons/content/add-circle";
import RemoveIcon from "material-ui/svg-icons/content/remove-circle";
import theme from "../styles/theme";
// import { dataTest } from "../lib/attributes";

const maxNumbersPerCampaign = 400;

const styles = StyleSheet.create({
  container: {
    border: `1px solid ${theme.colors.lightGray}`,
    borderRadius: 8
  },
  removeButton: {
    width: 50
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    borderBottom: `1px solid ${theme.colors.lightGray}`,
    marginBottom: 0,
    padding: 10
  },
  input: {
    width: 50,
    paddingLeft: 0,
    paddingRight: 0,
    marginRight: 10,
    marginTop: "auto",
    marginBottom: "auto",
    display: "inline-block"
  },
  errorMessage: {
    margin: "10px 0px",
    color: theme.colors.red
  }
});

const inlineStyles = {
  autocomplete: {
    marginBottom: 24,
    width: "100%"
  },
  header: {
    ...theme.text.header
  }
};

export default class CampaignPhoneNumbersForm extends React.Component {
  static propTypes = {
    formValues: type.object,
    onChange: type.func,
    customFields: type.array,
    saveLabel: type.string,
    phoneNumberCounts: type.array,
    contactsCount: type.number,
    onSubmit: type.func,
    saveDisabled: type.bool,
    contactsPerPhoneNumber: type.number,
    inventoryCounts: type.array,
    isStarted: type.bool
  };

  state = {
    searchText: "",
    showOnlySelected: false,
    error: ""
  };

  formSchema = yup.object({
    areaCode: yup.string(), // TODO: validate
    count: yup.number()
  });

  formValues() {
    return {
      ...this.props.formValues,
      inventoryPhoneNumberCounts: this.props.formValues
        .inventoryPhoneNumberCounts
    };
  }

  getTotalNumberCount = numbers =>
    numbers.reduce((acc, entry) => (acc = acc + entry.count), 0);

  subtitle = () => {
    const { contactsPerPhoneNumber } = this.props;
    return (
      <div>
        Select the area codes you would like to use for your campaign.
        <ul>
          <li>Contact an admin if you need more numbers.</li>
          <li>
            You can only assign one phone number for every{" "}
            {contactsPerPhoneNumber} contacts.
          </li>
          <li>
            When done texting and replying, you will need to archive the
            campaign
            <br />
            and release the phone numbers so other campaigns can use them.
          </li>
        </ul>
      </div>
    );
  };

  showSearch() {
    const { isStarted, phoneNumberCounts } = this.props;

    if (phoneNumberCounts.length === 0) {
      return (
        <div style={inlineStyles.autocomplete}>No phone numbers available</div>
      );
    }

    const filter = (searchText, key) =>
      key === "allphoneNumbers"
        ? true
        : AutoComplete.caseInsensitiveFilter(searchText, key);

    const autocomplete = (
      <AutoComplete
        ref="autocomplete"
        style={inlineStyles.autocomplete}
        onUpdateInput={searchText => this.setState({ searchText })}
        searchText={this.state.searchText}
        filter={filter}
        hintText="Find State or Area Code"
        name="areaCode"
        label="Find State or Area Code"
        dataSource={[]}
      />
    );
    const showAutocomplete = !isStarted && phoneNumberCounts.length > 0;
    return <div>{showAutocomplete ? autocomplete : ""}</div>;
  }

  getNumbersCount = count => (count === 1 ? "number" : "numbers");

  showPhoneNumbers() {
    const { searchText, showOnlySelected } = this.state;
    const { isStarted, contactsCount, contactsPerPhoneNumber } = this.props;
    const { inventoryPhoneNumberCounts: reservedNumbers } = this.formValues();
    const assignedNumberCount = this.getTotalNumberCount(reservedNumbers);
    const numbersNeeded = Math.ceil(contactsCount / contactsPerPhoneNumber);

    /* need to add selected phone counts to available phones;
       if navigated away after initial selection, the selected
       area codes will be removed from the counts passed down (from org) */
    let areaCodes = orderBy(
      this.props.phoneNumberCounts
        .map(phoneNumber => {
          const foundReserved = this.props.inventoryCounts.find(
            reserved => reserved.areaCode === phoneNumber.areaCode
          ) || { count: 0 };

          return {
            ...phoneNumber,
            allocatedCount: isStarted
              ? foundReserved.count
              : phoneNumber.allocatedCount + foundReserved.count,
            availableCount: phoneNumber.availableCount + foundReserved.count
          };
        })
        .filter(phoneNumber => (isStarted ? phoneNumber.allocatedCount : true)),
      ["state", "areaCode"]
    );

    if (showOnlySelected) {
      areaCodes = areaCodes.filter(item =>
        reservedNumbers.find(reserved => reserved.areaCode === item.areaCode)
      );
    }

    if (searchText) {
      if (!isNaN(searchText) && searchText.length <= 3) {
        const foundAreaCode = areaCodes.find(({ areaCode }) =>
          areaCode.includes(searchText)
        );
        areaCodes = foundAreaCode ? [foundAreaCode] : [];
      } else if (isNaN(searchText)) {
        areaCodes = areaCodes.filter(({ state }) =>
          state.toLowerCase().includes(searchText.toLowerCase())
        );
      }
    }

    const states = Array.from(new Set(areaCodes.map(({ state }) => state)));

    const getAssignedCount = areaCode => {
      const inventory = this.formValues().inventoryPhoneNumberCounts;
      return (
        (inventory.find(item => item.areaCode === areaCode) || {}).count || 0
      );
    };

    const assignAreaCode = areaCode => {
      const inventory = this.formValues().inventoryPhoneNumberCounts;
      this.props.onChange({
        inventoryPhoneNumberCounts: inventory.find(
          item => item.areaCode === areaCode
        )
          ? inventory.map(item =>
              item.areaCode === areaCode
                ? { ...item, count: item.count + 1 }
                : item
            )
          : [...inventory, { areaCode, count: 1 }]
      });
    };

    const unassignAreaCode = areaCode => {
      const inventory = this.formValues().inventoryPhoneNumberCounts;
      const inventoryPhoneNumberCounts = inventory
        .map(item =>
          item.areaCode === areaCode ? { ...item, count: item.count - 1 } : item
        )
        .filter(item => item.count);

      this.props.onChange({ inventoryPhoneNumberCounts });

      if (!inventoryPhoneNumberCounts.length && showOnlySelected) {
        this.setState({ showOnlySelected: false });
      }
    };

    return (
      <List
        style={{
          maxHeight: 340,
          overflowY: "auto",
          padding: "0 15px 0 0"
        }}
      >
        {states.map(state => (
          <ListItem
            key={state}
            primaryText={state}
            primaryTogglesNestedList
            initiallyOpen
            nestedItems={areaCodes
              .filter(areaCode => areaCode.state === state)
              .map(({ areaCode, availableCount }) => {
                const assignedCount = getAssignedCount(areaCode);
                return (
                  <ListItem
                    key={areaCode}
                    style={{
                      marginBottom: 15,
                      height: 16,
                      border: "1px solid rgb(225, 228, 224)",
                      borderRadius: 8
                    }}
                    disabled
                    primaryText={
                      <span>
                        <span style={{ marginRight: "20%" }}>{areaCode}</span>
                        <span style={{ color: "#888" }}>
                          {`${assignedCount}${
                            !isStarted ? ` / ${availableCount}` : ""
                          }`}
                        </span>
                      </span>
                    }
                    rightIconButton={
                      !isStarted && (
                        <div style={{ marginRight: 50 }}>
                          <IconButton
                            disabled={!assignedCount}
                            onClick={() => unassignAreaCode(areaCode)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <IconButton
                            disabled={
                              assignedCount === availableCount ||
                              assignedNumberCount === numbersNeeded
                            }
                            onClick={() => assignAreaCode(areaCode)}
                          >
                            <AddIcon />
                          </IconButton>
                        </div>
                      )
                    }
                  />
                );
              })}
          />
        ))}
      </List>
    );
  }

  renderErrorMessage() {
    const { error } = this.state;
    return <div className={css(styles.errorMessage)}>{error}</div>;
  }

  areaCodeTable() {
    const { inventoryPhoneNumberCounts: reservedNumbers } = this.formValues();
    const assignedNumberCount = this.getTotalNumberCount(reservedNumbers);
    const {
      isStarted,
      inventoryCounts,
      contactsCount,
      contactsPerPhoneNumber
    } = this.props;
    const numbersNeeded = Math.ceil(contactsCount / contactsPerPhoneNumber);
    const remaining = numbersNeeded - assignedNumberCount;

    const headerColor =
      assignedNumberCount === numbersNeeded
        ? theme.colors.darkBlue
        : theme.colors.red;

    const assignRandom = () => {
      let inventory = this.formValues().inventoryPhoneNumberCounts;

      const availableAreaCodes = flatten(
        this.props.phoneNumberCounts.map(phoneNumber => {
          const foundAllocated = inventory.find(
            ({ areaCode }) => areaCode === phoneNumber.areaCode
          ) || { count: 0 };

          /* until we save and navigate back and props.inventoryCounts
             has values, the phoneNumberCounts will need to have the
             "form state inventory" subtracted from the available count */
          const availableCount = !inventoryCounts.length
            ? phoneNumber.availableCount - foundAllocated.count
            : phoneNumber.availableCount;

          return Array.from(Array(availableCount)).map(
            () => phoneNumber.areaCode
          );
        })
      );

      const randomSample = sampleSize(availableAreaCodes, remaining).reduce(
        (obj, sample) => {
          obj[sample] = (obj[sample] || 0) + 1;
          return obj;
        },
        {}
      );

      inventory = inventory.map(inventoryItem => {
        let count = inventoryItem.count;
        if (randomSample[inventoryItem.areaCode]) {
          count += randomSample[inventoryItem.areaCode];
          delete randomSample[inventoryItem.areaCode];
        }

        return {
          ...inventoryItem,
          count
        };
      });

      this.props.onChange({
        inventoryPhoneNumberCounts: [
          ...inventory,
          ...Object.entries(randomSample).map(([areaCode, count]) => ({
            areaCode,
            count
          }))
        ]
      });
    };

    return (
      <div className={css(styles.container)}>
        <div className={css(styles.headerContainer)}>
          <div
            style={{
              flex: "1 1 50%",
              fontSize: 22,
              color: headerColor
            }}
          >
            <div style={{ margin: "5px 0 10px 5px" }}>
              {`Reserved phone numbers: ${assignedNumberCount}/${numbersNeeded}`}
            </div>
            {!isStarted && (
              <div style={{ display: "flex" }}>
                <RaisedButton
                  style={{ margin: "0 0 5px 5px" }}
                  label={`Randomly Assign Remaining ${remaining}`}
                  secondary
                  disabled={!remaining}
                  onClick={() => assignRandom()}
                />

                <Checkbox
                  style={{
                    margin: "5px 5px 0 auto",
                    fontSize: 14,
                    width: "auto"
                  }}
                  iconStyle={{ marginLeft: 4 }}
                  disabled={!reservedNumbers.length}
                  labelPosition="left"
                  label="Only show selected"
                  checked={this.state.showOnlySelected}
                  onCheck={() => {
                    this.setState(({ showOnlySelected }) => ({
                      showOnlySelected: !showOnlySelected,
                      searchText: ""
                    }));
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {this.showPhoneNumbers()}
      </div>
    );
  }

  render() {
    const { inventoryPhoneNumberCounts: reservedNumbers } = this.formValues();
    const assignedNumberCount = this.getTotalNumberCount(reservedNumbers);
    const { contactsCount, contactsPerPhoneNumber } = this.props;
    const numbersNeeded = Math.ceil(contactsCount / contactsPerPhoneNumber);

    return (
      <GSForm
        schema={this.formSchema}
        value={this.formValues()}
        onChange={this.props.onChange}
        onSubmit={() => {
          if (assignedNumberCount === numbersNeeded) {
            this.props.onSubmit();
          }
        }}
      >
        <CampaignFormSectionHeading
          title="Phone Numbers"
          subtitle={this.subtitle()}
        />
        {numbersNeeded <= maxNumbersPerCampaign ? (
          <div style={{ maxWidth: 500 }}>
            {this.showSearch()}
            {this.state.error && this.renderErrorMessage()}
            {this.areaCodeTable()}

            <Form.Button
              type="submit"
              disabled={
                this.props.saveDisabled || assignedNumberCount !== numbersNeeded
              }
              label={this.props.saveLabel}
            />
          </div>
        ) : (
          <div
            style={{
              flex: "1 1 50%",
              fontSize: 22,
              color: theme.colors.red
            }}
          >
            Sorry, you need to upload fewer contacts!
          </div>
        )}
      </GSForm>
    );
  }
}
