import { ZxcvbnFactory } from "@zxcvbn-ts/core"
import * as common from "@zxcvbn-ts/language-common"
import * as en from "@zxcvbn-ts/language-en"
import * as pl from "@zxcvbn-ts/language-pl"

const zxcvbn = new ZxcvbnFactory({
    translations: pl.translations,
    graphs: common.adjacencyGraphs,
    dictionary: {
        ...common.dictionary,
        ...en.dictionary,
        ...pl.dictionary
    }
})

export const checkPasswordStrength = (password: string, userInputs: string[]) => {
    const result = zxcvbn.check(password, userInputs)
    return {
        score: result.score,
        feedback: result.feedback,
    }
}
