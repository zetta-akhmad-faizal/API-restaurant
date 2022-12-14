const {ingredientModel} = require('./ingredient.model');
const {GraphQLError} = require('graphql')
const {mongoose} = require('mongoose');
const { recipeModel } = require('../Receipe/recipe.index');

const GetAllIngredients = async(parent, {data: {name, stock, limit, page, available, name_sort}}, ctx) => {
    let queriesGetAll; 
    let arr = [];
    let matchVal = {};
    let sorter = {}
    let matchObj = {};
    let skip

    if(stock < 0){
        throw new GraphQLError("Stock must be grather than 0")
    }

    matchVal['status'] = "Active";
    // matchCount['status'] = "Active"

    if(name){
        name = new RegExp(name,'i')
        matchVal['name'] = name
        // matchCount['name'] = name
    }
    if(stock){
        if(Number.isInteger(stock) !== true){
            throw new GraphQLError("Stock must be integer")
        }
        matchVal['stock'] = stock
        // matchCount['stock'] = stock
    }

    if(available === "Available"){
        available = true
        matchVal['available'] = available
        // matchCount['available'] = available
    }else if(available === "Unavailable"){
        available = false
        matchVal['available'] = available
        // matchCount['available'] = available
    }

    if(name_sort){
        sorter = {$sort: {name:name_sort, createdAt: -1}}
    }else{
        sorter = {$sort: {createdAt: -1}}
    }

    matchObj['$match'] = matchVal;
    
    arr.push(matchObj, sorter);

    if(limit && page || name === ""){
        skip = page > 0 ? ((page - 1)*limit):0;
        arr.push(
            {
                $skip: skip
            },
            {
                $limit: limit,
            }
        )
    }

    queriesGetAll = await ingredientModel.aggregate([
        {
            $facet: {
                ingredient_data: arr,
                info_page: [
                    {
                        $match: matchVal
                    },
                    {
                        $group: {_id: null, count: {$sum: 1}}
                    }
                ]
            }
        }
    ])
    // console.log(queriesGetAll)
    if(queriesGetAll[0].ingredient_data.length !== 0){
        return {message: "Ingredient is displayed", data: queriesGetAll[0]}
    }else{
        throw new GraphQLError("No ingredient show")
    }
}

const CreateIngredient = async(parent, {data: {name, stock,image_ingredient}}, ctx) => {
    // console.log(typeof stock)
    try{
        if(stock < 0){
            throw new GraphQLError("Stock must be grater than 0");
        }else if(!name && !stock){
            throw new GraphQLError("Name and stock must be filled");
        }

        if(Number.isInteger(stock) !== true){
            throw new GraphQLError("Stock must be integer")
        }

        let available;
        if(stock===0){
            available = false
        }else{
            available = true
        }
        let nameRegex = new RegExp(name, 'i');
        const queryUpdate = await ingredientModel.findOneAndUpdate(
            {name: nameRegex, status: "Deleted"},
            {$set:{status: "Active", stock, image_ingredient, available}},
            {new:true}
        )

        if(!queryUpdate){
            const queriesInsert = new ingredientModel({name, stock, image_ingredient, available});

            await queriesInsert.save()
            return {message: "Ingredient is saved", data: queriesInsert}
        }

        return {message: "Ingredient is available and updated", data: queryUpdate}
    }catch(e){
        throw new GraphQLError("Ingredient is available")
    }
}

const GetOneIngredient = async(parent, {data:{_id}}, ctx) => {
    if(!_id){
        throw new GraphQLError("_id is null")
    }
    const converterId = mongoose.Types.ObjectId(_id)
    const queriesGetOne = await ingredientModel.findOne({_id: converterId, status:"Active"});

    if(queriesGetOne){
        return {message: `Ingredients ${_id} is found`, data: queriesGetOne}
    }else{
        throw new GraphQLError(`Ingredients ${_id} isn't found`)
    }
}

const UpdateIngredient = async(parent, {data:{_id, name, stock}}, ctx) => {
    let message;

    if(!_id){
        throw new GraphQLError("_id is null")
    }

    const recipeCheck = await recipeModel.aggregate([
        {
            $lookup:{
                from: 'ingredients',
                localField: 'ingredients.ingredient_id',
                foreignField: '_id',
                as: 'anyIngredient'
            }
        },
        {
            $match: {
                'anyIngredient.name': name
            }
        }
    ])

    let available;
    let obj = {}
    
    if(stock === 0){
        available = false
    }else{
        available = true
    }

    if(recipeCheck.length > 0){
        obj["$set"] = {
            stock, available
        }
        message = "Stock and availability changes"
    }else{
        obj["$set"] = {
            stock, name, available
        }
        message  = "Name, stock and availability changes"
    }
    const queriesUpdate = await ingredientModel.findOneAndUpdate(
            {_id: mongoose.Types.ObjectId(_id), status: "Active"},
            obj,
            {new: true}
    )

    if(!queriesUpdate){
        throw new GraphQLError("Ingredient isn't updated")
    }
    return {message, data: queriesUpdate}
}

const DeleteIngredient = async(parent, {data: {_id}}, ctx) => {
    if(!_id){
        throw new GraphQLError("_id is null")
    }

    const recipeCheck = await recipeModel.aggregate([
        {
            $match: {
                status: "Active",
                "ingredients.ingredient_id": mongoose.Types.ObjectId(_id)
            }
        }
    ])
    if(recipeCheck.length !== 0){
        throw new GraphQLError("The ingredient has been used in recipes")
    }else{
        const queriesDelete = await ingredientModel.findOneAndUpdate(
            {_id: mongoose.Types.ObjectId(_id), status: "Active"},
            {
                $set: {
                    status: "Deleted"
                }
            }
        )
        if(!queriesDelete){
            throw new GraphQLError("Ingredient isn't deleted")
        }
    
        return {message: "Ingredient is deleted", data: queriesDelete}
    }
}

const loaderOfingredient = async(parent, args, ctx) => {
    // console.log(parent)
    if(parent){
        return await ctx.ingredientLoader.load(parent.ingredient_id);
    }
}

module.exports = {
    Mutation: {
        CreateIngredient,
        UpdateIngredient,
        DeleteIngredient
    },
    Query: {
        GetAllIngredients,
        GetOneIngredient
    },
    recipeIngredientsField: {
        ingredient_id: loaderOfingredient
    }
}