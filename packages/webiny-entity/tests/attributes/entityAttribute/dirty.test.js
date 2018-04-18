import { assert } from "chai";
import { QueryResult } from "../../../src";
import { One } from "../../entities/oneTwoThree";
import sinon from "sinon";

const sandbox = sinon.sandbox.create();
const getEntity = async () => {
    const id =
        "_" +
        Math.random()
            .toString(36)
            .substr(2, 9);
    let entityFindById = sandbox
        .stub(One.getDriver(), "findOne")
        .onCall(0)
        .callsFake(() => {
            return new QueryResult({ id, name: "One", two: "two" });
        });

    const entity = await One.findById(id);
    entityFindById.restore();
    return entity;
};

describe("dirty flag test", function() {
    beforeEach(() => One.getEntityPool().flush());
    afterEach(() => sandbox.restore());

    it("when loading from storage, default value must be clean", async () => {
        const entity = await getEntity();
        const twoAttribute = entity.getAttribute("two");
        assert.isFalse(twoAttribute.value.dirty);
    });

    it("new entity - when setting a value, dirty must be set as true only if different", async () => {
        let entity = new One();
        let twoAttribute = entity.getAttribute("two");

        entity.two = "anotherTwo";
        assert.isTrue(twoAttribute.value.dirty);

        entity = new One();
        twoAttribute = entity.getAttribute("two");

        entity.two = null;
        assert.isFalse(twoAttribute.value.dirty);

        entity = new One();
        twoAttribute = entity.getAttribute("two");

        entity.two = { something: true };
        assert.isTrue(twoAttribute.value.dirty);

        entity = new One();
        twoAttribute = entity.getAttribute("two");

        entity.two = { id: "asd" };
        assert.isTrue(twoAttribute.value.dirty);

        entity = new One();
        twoAttribute = entity.getAttribute("two");

        entity.two = { id: "asd", something: true };
        assert.isTrue(twoAttribute.value.dirty);
    });

    it("loaded entity - when setting a value, dirty must be set as true only if different", async () => {
        let entity = await getEntity();
        let twoAttribute = entity.getAttribute("two");

        entity.two = "anotherTwo";
        assert.isTrue(twoAttribute.value.dirty);

        entity = await getEntity();
        twoAttribute = entity.getAttribute("two");

        entity.two = "two";
        assert.isFalse(twoAttribute.value.dirty);

        entity = await getEntity();
        twoAttribute = entity.getAttribute("two");

        entity.two = null;
        assert.isTrue(twoAttribute.value.dirty);
    });

    it("when setting an object with ID, value must not be dirty if ID is same", async () => {
        let entity = await getEntity();
        let twoAttribute = entity.getAttribute("two");

        entity.two = { id: "two" };
        assert.isFalse(twoAttribute.value.dirty);
    });

    it("when setting an object with ID but with additional fields, value must be set as dirty", async () => {
        let entity = await getEntity();
        let twoAttribute = entity.getAttribute("two");

        entity.two = { id: "two", someAttr: 1 };
        assert.isTrue(twoAttribute.value.dirty);
    });

    it("should not be dirty when loading value from storage", async () => {
        const one = await getEntity();
        const twoAttribute = one.getAttribute("two");
        assert.isFalse(twoAttribute.value.dirty);

        let findById = sandbox.stub(One.getDriver(), "findOne").callsFake(() => {
            return new QueryResult({ id: "two", name: "Two" });
        });

        const two = await one.two;
        assert.isFalse(twoAttribute.value.isDirty());

        two.name = "anotherName";

        assert.isTrue(twoAttribute.value.isDirty());

        findById.restore();
    });

    it("should save entity only if dirty, amd set it as clean after save", async () => {
        const one = await getEntity();

        let findById = sandbox.stub(One.getDriver(), "findOne").callsFake(() => {
            return new QueryResult({ id: "two", name: "Two" });
        });

        const two = await one.two;
        findById.restore();

        const entitySaveSpy = sandbox.spy(One.getDriver(), "save");

        await one.save();
        assert.equal(entitySaveSpy.callCount, 0);

        two.name = "anotherName";
        assert.isTrue(two.isDirty());
        await one.save();
        assert.equal(entitySaveSpy.callCount, 1);
        assert.isTrue(two.isClean());

        await one.save();
        assert.equal(entitySaveSpy.callCount, 1);
        assert.isTrue(two.isClean());
    });
});