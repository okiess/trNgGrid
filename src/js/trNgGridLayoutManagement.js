var TrNgGrid;
(function (TrNgGrid) {
    (function (GridSectionType) {
        GridSectionType[GridSectionType["Enforced"] = 0] = "Enforced";
        GridSectionType[GridSectionType["Header"] = 1] = "Header";
        GridSectionType[GridSectionType["Body"] = 2] = "Body";
    })(TrNgGrid.GridSectionType || (TrNgGrid.GridSectionType = {}));
    var GridSectionType = TrNgGrid.GridSectionType;
    var GridLayoutRow = (function () {
        function GridLayoutRow(gridConfiguration, gridLayout, gridSectionType) {
            this.gridConfiguration = gridConfiguration;
            this.gridLayout = gridLayout;
            this.gridSectionType = gridSectionType;
            this.cells = [];
        }
        GridLayoutRow.prototype.findCell = function (fieldName) {
            for (var cellIndex = 0; cellIndex < this.cells.length; cellIndex++) {
                if (this.cells[cellIndex].fieldName === fieldName) {
                    return this.cells[cellIndex];
                }
            }
            return null;
        };
        GridLayoutRow.prototype.registerCell = function (cell, index) {
            if (!cell.fieldName) {
                throw 'A field name was not provided';
            }
            var cellFound = false;
            if (index === undefined) {
                for (var cellIndex = 0; (cellIndex < this.cells.length) && (!cellFound); cellIndex++) {
                    if (this.cells[cellIndex].fieldName === cell.fieldName) {
                        this.cells[cellIndex] = cell;
                        this.gridConfiguration.debugMode && TrNgGrid.log("A layout cell [" + cell.fieldName + "] was updated in section " + this.gridSectionType);
                        cellFound = true;
                    }
                }
            }
            if (!cellFound) {
                if (index === undefined || index === this.cells.length) {
                    this.cells.push(cell);
                }
                else {
                    this.cells.splice(index, 0, cell);
                }
                this.gridConfiguration.debugMode && TrNgGrid.log("A new layout cell [" + cell.fieldName + "] was registered in section " + this.gridSectionType);
            }
            this.gridLayout.triggerReconciliation();
        };
        GridLayoutRow.prototype.unregisterCell = function (cell) {
            for (var cellIndex = 0; cellIndex < this.cells.length; cellIndex++) {
                if (this.cells[cellIndex] === cell) {
                    this.cells.splice(cellIndex, 1);
                    this.gridConfiguration.debugMode && TrNgGrid.log("A layout cell [" + cell.fieldName + "] was unregistered in section " + this.gridSectionType);
                    this.gridLayout.triggerReconciliation();
                    return;
                }
            }
        };
        return GridLayoutRow;
    })();
    TrNgGrid.GridLayoutRow = GridLayoutRow;
    var GridLayoutSection = (function () {
        function GridLayoutSection(gridConfiguration, gridLayout, gridSectionType) {
            this.gridConfiguration = gridConfiguration;
            this.gridLayout = gridLayout;
            this.gridSectionType = gridSectionType;
            this.rows = [];
        }
        GridLayoutSection.prototype.registerRow = function () {
            var row = new GridLayoutRow(this.gridConfiguration, this.gridLayout, this.gridSectionType);
            this.rows.push(row);
            this.gridConfiguration.debugMode && TrNgGrid.log("A new layout row [" + this.rows.length + "] was registered in section " + this.gridSectionType);
            this.gridLayout.triggerReconciliation();
            return row;
        };
        GridLayoutSection.prototype.unregisterRow = function (row) {
            for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
                if (this.rows[rowIndex] === row) {
                    this.rows.splice(rowIndex, 1);
                    this.gridConfiguration.debugMode && TrNgGrid.log("A layout row was unregistered in section " + this.gridSectionType);
                    this.gridLayout.triggerReconciliation();
                    return;
                }
            }
        };
        GridLayoutSection.prototype.clear = function () {
            this.rows.splice(0);
            this.gridConfiguration.debugMode && TrNgGrid.log("Layout section " + this.gridSectionType + " got cleared");
            this.gridLayout.triggerReconciliation();
        };
        return GridLayoutSection;
    })();
    TrNgGrid.GridLayoutSection = GridLayoutSection;
    var GridLayout = (function () {
        function GridLayout(gridConfiguration, gridOptions) {
            this.gridConfiguration = gridConfiguration;
            this.gridOptions = gridOptions;
            this.sections = new Array(2 /* Body */ + 1);
            this.reconciliationTriggerKey = "triggerGridReconciliation";
            this.reconciling = false;
            this.setupListeners();
        }
        GridLayout.prototype.getSection = function (section) {
            var colSection = this.sections[section];
            if (!colSection) {
                this.sections[section] = colSection = new GridLayoutSection(this.gridConfiguration, this, section);
                this.gridConfiguration.debugMode && TrNgGrid.log("A new layout section [" + section + "] was registered");
                this.triggerReconciliation();
            }
            return colSection;
        };
        GridLayout.prototype.triggerReconciliation = function () {
            this.gridOptions[this.reconciliationTriggerKey] = true;
        };
        GridLayout.prototype.setupListeners = function () {
            var _this = this;
            this.gridOptions.$watch(this.reconciliationTriggerKey, function (reconciliationTriggered) {
                if (reconciliationTriggered) {
                    _this.reconcile();
                }
            });
            var itemsFieldExtractionWatcherDereg = null;
            itemsFieldExtractionWatcherDereg = this.gridOptions.$watch("items.length", function (newLength) {
                if (newLength) {
                    var fields = new Array();
                    for (var fieldName in _this.gridOptions.items[0]) {
                        fields.push(fieldName);
                    }
                    _this.enforceFields(fields);
                    if (itemsFieldExtractionWatcherDereg) {
                        itemsFieldExtractionWatcherDereg();
                        itemsFieldExtractionWatcherDereg = null;
                    }
                }
            });
            if (this.gridOptions.fields) {
                this.enforceFields(this.gridOptions.fields);
                if (itemsFieldExtractionWatcherDereg) {
                    itemsFieldExtractionWatcherDereg();
                    itemsFieldExtractionWatcherDereg = null;
                }
            }
            this.gridOptions.$watchCollection("fields", function (newFields, oldFields) {
                if (!angular.equals(newFields, oldFields)) {
                    _this.enforceFields(newFields || []);
                    if (itemsFieldExtractionWatcherDereg) {
                        itemsFieldExtractionWatcherDereg();
                        itemsFieldExtractionWatcherDereg = null;
                    }
                }
            });
        };
        GridLayout.prototype.enforceFields = function (fields) {
            var enforcedSection = this.getSection(0 /* Enforced */);
            if (fields) {
                enforcedSection.clear();
                var enforcedSectionVirtualRow = enforcedSection.registerRow();
                angular.forEach(fields, function (fieldName) {
                    enforcedSectionVirtualRow.registerCell({
                        fieldName: fieldName,
                        isAutoGenerated: true,
                        isLinkedToField: true
                    });
                });
            }
            else {
                enforcedSection.clear();
            }
        };
        GridLayout.prototype.reconcile = function () {
            var _this = this;
            try {
                var extractedFieldNames = new Array();
                var sectionIndex;
                for (sectionIndex = 0 /* Enforced */; sectionIndex <= 1 /* Header */ && extractedFieldNames.length === 0; sectionIndex++) {
                    angular.forEach(this.getSection(sectionIndex).rows, function (row) {
                        angular.forEach(row.cells, function (cell) {
                            if (cell.isLinkedToField) {
                                extractedFieldNames.push(cell.fieldName);
                            }
                        });
                    });
                }
                ;
                var preparedRows = new Array();
                for (sectionIndex = 0 /* Enforced */; sectionIndex <= 2 /* Body */; sectionIndex++) {
                    angular.forEach(this.getSection(sectionIndex).rows, function (row) {
                        if (sectionIndex !== 0 /* Enforced */) {
                            _this.cleanupRowForReconciliation(row, extractedFieldNames);
                        }
                        preparedRows.push(row);
                    });
                }
                ;
                for (var rowIndex = 0; rowIndex < preparedRows.length - 1; rowIndex++) {
                    this.reconcileRows(preparedRows[rowIndex], preparedRows[rowIndex + 1]);
                }
            }
            finally {
                this.gridOptions[this.reconciliationTriggerKey] = false;
            }
        };
        GridLayout.prototype.reconcileRows = function (templateRow, targetRow) {
            var currentTargetRowRegistrationIndex = 0;
            for (var templateCellRegistrationIndex = 0; templateCellRegistrationIndex < templateRow.cells.length; templateCellRegistrationIndex++) {
                var templateCellRegistration = templateRow.cells[templateCellRegistrationIndex];
                if (templateCellRegistration.isDeactivated) {
                    continue;
                }
                var matchNotFound = true;
                while (matchNotFound) {
                    var currentTargetCellRegistration = currentTargetRowRegistrationIndex < targetRow.cells.length ? targetRow.cells[currentTargetRowRegistrationIndex] : null;
                    if (!currentTargetCellRegistration || !currentTargetCellRegistration.isDeactivated) {
                        if ((!currentTargetCellRegistration) || (currentTargetCellRegistration.isLinkedToField !== templateCellRegistration.isLinkedToField) || ((currentTargetCellRegistration.isLinkedToField) && (currentTargetCellRegistration.fieldName !== templateCellRegistration.fieldName))) {
                            currentTargetCellRegistration = angular.extend({}, templateCellRegistration);
                            currentTargetCellRegistration.isAutoGenerated = true;
                            currentTargetCellRegistration.isCustomized = false;
                            targetRow.registerCell(currentTargetCellRegistration, currentTargetRowRegistrationIndex);
                        }
                        matchNotFound = false;
                    }
                    currentTargetRowRegistrationIndex++;
                }
            }
            while (currentTargetRowRegistrationIndex < targetRow.cells.length) {
                var extraCellRegistration = targetRow.cells[currentTargetRowRegistrationIndex];
                if (extraCellRegistration.isAutoGenerated) {
                    targetRow.unregisterCell(extraCellRegistration);
                }
                else {
                    extraCellRegistration.isDeactivated = true;
                    currentTargetRowRegistrationIndex++;
                }
            }
        };
        GridLayout.prototype.cleanupRowForReconciliation = function (targetRow, fields) {
            for (var cellRegistrationIndex = 0; cellRegistrationIndex < targetRow.cells.length; cellRegistrationIndex++) {
                var cellRegistration = targetRow.cells[cellRegistrationIndex];
                if (cellRegistration.isAutoGenerated) {
                    targetRow.unregisterCell(cellRegistration);
                    cellRegistrationIndex--;
                }
                else {
                    cellRegistration.isDeactivated = cellRegistration.isLinkedToField && (fields.indexOf(cellRegistration.fieldName) < 0);
                }
            }
        };
        return GridLayout;
    })();
    TrNgGrid.GridLayout = GridLayout;
})(TrNgGrid || (TrNgGrid = {}));
